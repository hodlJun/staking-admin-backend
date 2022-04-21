import {
  getBlockInfo,
  getTransactionInfo,
  decimal,
  arowanaDecimal,
  getContract,
} from '../utils/Web3';
import { getDBPoolLength } from '../utils/DB';
import {
  eventFilter,
  getEvents,
  getDepositWithdraw,
  getReward,
} from '../utils/Event';
import { convertToDate } from '../utils/Date';
import { poolUser } from './poolUser';

export const txsSync = async (_db: any) => {
  try {
    console.log('------Txs Sync Start-------');
    let dbTxsLength = await getDBPoolLength(_db, 'txs');
    const contract = getContract();
    const arowanaDec = await arowanaDecimal();
    let pureEvent;
    let dbLatestId;
    // txs테이블에 데이터가 없을때
    if (dbTxsLength !== 0) {
      //txs테이블에 데이터가 있을때

      // txs테이블에서 마지막로우 blocknumber, id 가져옴
      const txsQuery = await _db.query(
        `select blocknumber, id from txs order by id desc limit 1`
      );
      const BlockNumber: number = txsQuery[0].blocknumber;
      dbLatestId = txsQuery[0].id + 1;
      pureEvent = await getEvents(BlockNumber);
      pureEvent.shift(); // 제네시스블록은 이미있어서 제외
    } else {
      // txs테이블에 데이터가 없을때
      dbTxsLength = 0;
      dbLatestId = 0;
      pureEvent = await getEvents();
    }

    if (!pureEvent.length) {
      console.log('------Txs Sync End-------');
      return;
    }

    const event = pureEvent.filter(eventFilter); // Deposit, Withdraw만 필터

    if (!event.length) {
      // 블록은 생겼지만 Deposit 혹은 Withdraw가 아닐때(유효한 Tx)
      console.log('------Txs Sync End-------');
      return;
    }

    // Deposit 혹은 Withdraw 이벤트인 Tx가 있을때
    const blockNumberArray = event.map((tx: any) => tx.blockNumber);
    const pidAmountArray = [];
    const BlockInfoPromise = [];
    const txInfoPromise = [];

    for (let i = 0; i < event.length; i++) {
      BlockInfoPromise.push(getBlockInfo(blockNumberArray[i]));
      txInfoPromise.push(getTransactionInfo(event[i].transactionHash));
      const { pid, amount } = getDepositWithdraw(event[i]);
      pidAmountArray.push({ pid, amount });
    }

    const BlockInfoArray = await Promise.all(BlockInfoPromise);
    const txInfoArray = await Promise.all(txInfoPromise);

    for (let i = 0; i < event.length; i++) {
      const id = dbLatestId + i;
      const blockNumber = blockNumberArray[i];
      const { timestamp } = BlockInfoArray[i];
      const { gasUsed, effectiveGasPrice, from } = txInfoArray[i];
      const { pid } = pidAmountArray[i];
      const txFee = decimal(gasUsed * effectiveGasPrice, arowanaDec);
      const eventName = event[i].event;
      const { logs } = txInfoArray[i];

      let rewardAmount: any = '-';
      let stakingFee: any = '-';
      if (eventName === 'Withdraw') {
        if (logs.length === 6) {
          // logs의 길이가 6일때
          console.log(logs);
          rewardAmount =
            Number(decimal(logs[0].data)) +
            Number(decimal(logs[5].data)) -
            Number(decimal(logs[2].data));
          stakingFee = decimal(logs[2].data);
        } else {
          // logs의 길이가 2일때
          rewardAmount = Number(decimal(logs[logs.length - 1].data));
        }
      }
      let { amount }: any = pidAmountArray[i];
      let reward: any = '-';

      if (amount !== '-') {
        amount = decimal(amount, arowanaDec);
        reward = await getReward(pid, from).then((reward) => {
          if (reward !== '-') {
            return decimal(reward, arowanaDec);
          }
          return '-';
        });
      }

      await _db.query(
        `insert into txs(id,blocknumber,fromaddress,txdate,pid,amount,reward,txfee,eventname,rewardamount,stakingfee) values(${id},${blockNumber},'${from}','${convertToDate(
          timestamp
        )}','${pid}','${amount}','${reward}','${txFee}','${eventName}','${rewardAmount}','${stakingFee}')`
      );

      await poolUser(
        eventName,
        pid,
        from,
        convertToDate(timestamp),
        amount,
        rewardAmount,
        _db,
        contract,
        stakingFee
      );
    }
    _db.end();
    console.log('------Txs Sync End-------');
  } catch (err) {
    console.log('Txs Sync Error : ', err);
  }
};

// 이 함수는 eventname,pid,from,txdate,amount,rewardamount,db,contract 매개변수
import { getPoolInfo } from '../utils/Web3';
import { convertToDate, dayDiff } from '../utils/Date';
import { getDBPoolLength } from '../utils/DB';
import { Contract } from 'web3-eth-contract';

export const poolUser = async (
  _eventName: string,
  _pid: string,
  _fromaddress: string,
  _txdate: string,
  _amount: string,
  _rewardAmount: string,
  _db: any,
  _contract: Contract,
  _stakingFee: string
) => {
  try {
    // 해당 이벤트명을 읽음
    // pooluser에 존재하지 않을때는 insert
    // 존재하면 update

    /* deposit일때 */

    // pooluser에 존재할때
    // select 에서 pid 주소로 찾으면 나오고 그 id값을 가지고 update한다.
    // 넣고뺴고넣고하면 여기로 온다.

    // pooluser에 존재하지 않을때
    // deposit에 넣고 date도 넣고 with들은 비우면된다.

    // 혹은 여러번 deposit 이면
    // select 에서 pid,주소 해서 deposit 2개 + stakingfee 가져와서
    // depositamount는 기존하고 더하고,date는 이 txdate꺼
    // with는 그대로 가져와서 해주면된다.

    // deposit 일떄 무조건 depositamount 더하고, depositdate에 날짜를 넣는다.
    console.log('------PoolUser Sync Start-------');
    // 1. eventName 검사
    if (_eventName === 'Deposit') {
      const selectPoolUser = await _db.query(
        `select id, depositamount, depositdate,withdrawamount, withdrawdate from pooluser where fromaddress='${_fromaddress}' and pid='${_pid}'`
      );
      const idLength = await getDBPoolLength(_db, 'pooluser');

      // 존재하지 않을때
      let depositAmount = _amount;
      let depositDate = _txdate;
      let withdrawAmount = 0;
      let withdrawDate = '-';
      let id = 0;
      let stakingFee = '-';
      if (idLength !== undefined) {
        id = idLength;
      }

      if (selectPoolUser[0] !== undefined) {
        // deposit이며 pooluser에 존재할때
        id = selectPoolUser[0].id;
        depositAmount = (
          parseFloat(_amount) + parseFloat(selectPoolUser[0].depositamount)
        ).toString();
        depositDate = _txdate;
        withdrawAmount = selectPoolUser[0].withdrawamount;
        withdrawDate = selectPoolUser[0].withdrawdate;
        // 존재할때 쿼리

        await _db.query(
          `update pooluser set depositdate='${depositDate}', depositamount='${depositAmount}', withdrawdate='${withdrawDate}', withdrawamount='${withdrawAmount}', stakingfee='${stakingFee}' where id='${id}'`
        );
      } else {
        // 존재하지않을때 쿼리
        await _db.query(
          `insert into pooluser (pid, fromaddress, depositdate, depositamount, withdrawdate, withdrawamount, stakingfee) values('${_pid}','${_fromaddress}','${depositDate}','${depositAmount}','${withdrawDate}','${withdrawAmount}','${stakingFee}')`
        );
      }
    }

    if (_eventName === 'Withdraw') {
      // 해당 이벤트명을 읽음
      // pooluser에 존재하지 않을때는 insert
      // 존재하면 update

      /* Withdraw일때 */

      /* withdraw를 한다는것은 이미 pooluser에 있다는거다. */

      // withdraw 일때 시작일전에 넣었다 뻇다고 생각하면
      // withdraw를 찾고 날짜가 Daydiff(시작일,withdate) > 0 이면
      // deposit에서 뺀다. 이때 deposit이 0이면
      // depositamount, date, withdrawamount, withdrawdate를 비운다
      // 이러면 pooluser에 id,pid, from을 제외하고 다 빈칸이되니까

      // withdraw 에서 만기에 뻇다고하면
      // withdrawamount, withdrawdate 채우고
      // depositdate, depositamount 가져오고
      // 여기서 withdrawamount 와 depositamount 가 같다면
      // 정상루트이기때문에 withdrawamount = rewardamount;를한다
      // update 한다.
      // * withdraw할때 일부만 빼는건 불가능하다. 한번에 다 뺀다.
      const selectPoolUser = await _db.query(
        `select id, depositamount, depositdate,withdrawamount, withdrawdate from pooluser where fromaddress='${_fromaddress}' and pid='${_pid}'`
      );

      const poolStartDate = await getPoolInfo(_contract, parseInt(_pid)).then(
        (obj: any) => convertToDate(obj.start)
      );
      const diff = dayDiff(poolStartDate, _txdate);
      let depositAmount: any = selectPoolUser[0].depositamount;
      let depositDate = selectPoolUser[0].depositdate;
      let withdrawAmount: any = _amount;
      let withdrawDate = _txdate;
      let id = selectPoolUser[0].id;
      let stakingFee = _stakingFee;

      if (diff > 0) {
        // 시작일전의 withdraw
        depositAmount = (
          parseFloat(selectPoolUser[0].depositamount) - parseFloat(_amount)
        ).toString();
        if (parseFloat(depositAmount) === 0) {
          depositAmount = 0;
          depositDate = '-';
          withdrawAmount = 0;
          withdrawDate = '-';
        }
      } else {
        // 정상 withdraw
        if (parseFloat(depositAmount) === parseFloat(withdrawAmount)) {
          withdrawAmount = _rewardAmount;
        }
      }
      // withdraw 공통쿼리
      await _db.query(
        `update pooluser set depositdate='${depositDate}', depositamount='${depositAmount}', withdrawdate='${withdrawDate}', withdrawamount='${withdrawAmount}', stakingfee='${stakingFee}' where id='${id}'`
      );
    }

    console.log('------PoolUser Sync End-------');
  } catch (err) {
    console.log('PoolUser Error : ', err);
  }
};

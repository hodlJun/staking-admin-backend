import {
  getPoolLength,
  getPoolInfo,
  decimal,
  arowanaDecimal,
} from '../utils/Web3';
import { convertToDate, dayDiff } from '../utils/Date';
import { getDBPoolLength } from '../utils/DB';
import { Contract } from 'web3-eth-contract';

export const poolSync = async (_contract: Contract, _db: any) => {
  try {
    // mainContract
    console.log('------Pool Sync Start-------');
    const mainPoolLength = await getPoolLength(_contract); // ca에서 최신 pool 길이
    const arowanaDec = await arowanaDecimal();
    let dbPoolLength: number | undefined = await getDBPoolLength(_db, 'pool');

    // 데이터가 없을시
    if (dbPoolLength === undefined) dbPoolLength = 0;

    const promiseArray = [];
    for (let i = dbPoolLength; i < mainPoolLength; i++) {
      promiseArray.push(getPoolInfo(_contract, i));
    }

    const newPoolInfoArray = await Promise.all(promiseArray);

    if (newPoolInfoArray.length === 0) {
      console.log('------Pool Sync End-------');
      return;
    }

    for (let i = 0; i < newPoolInfoArray.length; i++) {
      const result = newPoolInfoArray[i];
      const open = convertToDate(result.open);
      const start = convertToDate(result.start);
      const end = convertToDate(result.end);
      const diff = dayDiff(
        convertToDate(result.end),
        convertToDate(result.start)
      );
      const convertCap = decimal(result.cap, arowanaDec);
      const convertAmount = decimal(result.amount, arowanaDec);
      const convertFinalAmount = decimal(result.finalAmount, arowanaDec);
      const ratio =
        (parseFloat(convertFinalAmount) / parseFloat(convertCap)) * 100;

      await _db.query(
        `insert into pool values(${
          dbPoolLength + i
        },'${open}','${start}','${end}',${diff},${convertCap},${convertCap},${convertFinalAmount},${convertAmount},${ratio})`
      );
    }
  } catch (err) {
    console.log('Pool Sync Error: ', err);
  }
};

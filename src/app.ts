import express, { Request, Response } from 'express';
import mariadb from 'mariadb';
import cors from 'cors';
import { Contract } from 'web3-eth-contract';
import { getContract } from '../utils/Web3';
import { poolSync } from './pool';
import { txsSync } from './txs';
import dotenv from 'dotenv';

dotenv.config();

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PWD,
  port: 3306,
  database: process.env.DB_DATABASE,
});

const app = express();
const port = 4000;

app.use(cors());

let contract: Contract;
let db: any;

const dbSync = async () => {
  try {
    console.log('Sync in');
    contract = getContract(); // mainContract
    db = await pool.getConnection();

    // pool sync
    await poolSync(contract, db).then(() =>
      console.log('------Pool Sync End-------')
    );

    // txs sync, pooluser sync
    await txsSync(db).then(() => console.log('Sync out'));
  } catch (err) {
    console.log(err);
  }
};

app.get('/pool', async (req: Request, res: Response) => {
  try {
    // sync
    await dbSync();
    const poolQuery = await db.query(`select * from pool`);
    const poolUserQuery = await db.query(`select * from pooluser`);

    for (let i = 0; i < poolQuery.length; i++) {
      const arr = [];
      for (let j = 0; j < poolUserQuery.length; j++) {
        if (poolQuery[i].pid === poolUserQuery[j].pid) {
          arr.push(poolUserQuery[j]);
        }
      }
      poolQuery[i] = { ...poolQuery[i], pooluser: arr };
    }

    const result = { pool: poolQuery, length: poolQuery.length };
    res.status(200).send(result);
    console.log('Pool Response Success');
  } catch (err) {
    throw err;
  }
});

app.get('/txs', async (req: Request, res: Response) => {
  try {
    // sync
    await dbSync();
    const txsQuery = await db.query(`select * from txs`);
    const result = { txs: txsQuery, length: txsQuery };
    res.status(200).send(result);
    console.log('Txs Response Success');
  } catch (err) {
    throw err;
  }
});

app.listen(port, () => {
  console.log('Server Running Port : 4000');
});

/* DB Connect and Query*/
// const db: any = await Connect();
// const result = await db.query(
//   `insert into pool (pid, open, start, end, diff, apr, cap, finalamount, amount, ratio) values(1,'2022-02-03','2022-02-03','2022-02-03','15','10','50000',50000.123456789101112131415161718,'50000.123456789101112131415161718','50000.123456789101112131415161718')`
// );

// 트랜잭션들의 길이가 똑같은가 ?
// 다르다면 풀에 대한 정보도 변했을것이다. => 기존 풀에대한 정보들 다 탐색 후 다르면 값변경
// 풀 길이도 검색 => 다르다 ? 그럼 추가

// pooluser 테이블은 해당 풀의 주소들을 기준으로 값들 최신화

// Sync 함수는 pool txs pooulser 모두 업데이트 해야한다.

// 출금액 = 이더스캔의 토큰트랜스퍼드의 1(이자) + 3(입금량) - 2(staking수수료) 하면된다.
// logs 기준으로는 0 + 5 - 2 들의 data 들을 계산해주면 최종 출금량
// 실패한 tx는 이벤트필터에서 걸러짐

// txs테이블에 logs가 아니라 그 벨류들을 담는 컬럼이 필요함

// 레시피에서 빼온 data들은 decimal에 그대로 넣으면 알아서 처리된다.

// rewardamount랑 이더스캔의 토큰트랜스퍼드 값들이랑 동일함.

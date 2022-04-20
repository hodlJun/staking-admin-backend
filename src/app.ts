import express, { Request, Response, NextFunction } from 'express';
import mariadb from 'mariadb';
import { getContract } from '../utils/Web3';
import { poolSync } from './pool';
import { txsSync } from './txs';
import dotenv from 'dotenv';

dotenv.config();

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PWD,
  port: 3307,
  database: 'staking-pool',
});

// const dbConnect = async () => {
//   let connect;
//   try {
//     connect = await pool.getConnection();
//     console.log('DB Connected ! ');
//   } catch (err) {
//     connect = err;
//     console.log('DB Connect error :', err);
//   }
//   return connect;
// };

const app = express();
const port = 4000;

// db 연결
// contract 연결
//

let contract: any;
let db: any;

const dbSync = async () => {
  try {
    console.log('Sync in');
    contract = getContract(); // mainContract
    db = await pool.getConnection();

    // pool sync
    poolSync(contract, db);

    // txs sync, pooluser sync
    txsSync(db).then(() => console.log('Sync out'));
  } catch (err) {
    console.log(err);
  }
};

app.get('/pool', async (req, res) => {
  try {
    // sync
    // await dbSync();
    db = await pool.getConnection();
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

app.get('/txs', async (req, res) => {
  try {
    // sync
    // await dbSync();
    db = await pool.getConnection();
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

// pool 길이로 최신화하는것도 맞는거지만
// 기간이 끝나지 않은 모든 풀에 대한 정보를 비교하고 다르면 그 해당 풀에 대한 값들을 다
// 변경해주어야 한다.

// 트랜잭션들의 길이가 똑같은가 ?
// 다르다면 풀에 대한 정보도 변했을것이다. => 기존 풀에대한 정보들 다 탐색 후 다르면 값변경
// 풀 길이도 검색 => 다르다 ? 그럼 추가

// 1. 모든 tx 다 가져옴
// 2. tx에서 pid가 있는것들(deposit, withdraw 만 찾음)
// 2-1 하나의 배열
// 3. pid순으로 다 정렬
// 4.

// pooluser 테이블은 해당 풀의 주소들을 기준으로 값들 최산화
// 새로운 tx가 생기면 그 값도 변화되게 코드 있어야함
// 정렬은 pid 기준으로

/* 
데이터 예시

array = [{pool 1},{pool 2}, ...]

pool 
{
'주소' : {
            '입금일자' : 
            '입금액' :
            ...
        }


}


*/

// return 문 넣었던 코드 수정할것 => return 으로 종료시키면 pooluser 테이블 채우는코드
// 실행못함
// 아니면 블록이 똑같지 않은 코드에서 pooluser 계산해서 넣는 함수를 넣던지.

// Sync 함수는 pool txs pooulser 모두 업데이트 해야한다.

// 출금액 = 이더스캔의 토큰트랜스퍼드의 1(이자) + 3(입금량) - 2(staking수수료) 하면된다.
// logs 기준으로는 0 + 5 - 2 들의 data 들을 계산해주면 최종 출금량
// 실패한 tx는 이벤트필터에서 걸러짐

// txs테이블에 logs가 아니라 그 벨류들을 담는 컬럼이 필요함

// 레시피에서 빼온 data들은 decimal에 그대로 넣으면 알아서 처리된다.

// rewardamount랑 이더스캔의 토큰트랜스퍼드 값들이랑 동일함.

// 월요일부터 할일
// 해당 오류부분은 pooluser로 데이터 저장하는 쿼리고 id는 pooluser의 로우검색해서
// id값 가져오고 거기서 +1 하면서 해야할듯

// 우선 지금 코드가 1pid로 검색해서 했는데 for문이 또 추가되면 3중 for문이 되는데 이것도 문제다..

// txs랑도 다 불러왔을때 트랜잭션을 까고 pooluser에 추가하는 코드는 맨처음으로 데이터를 쌓는거랑
// 기존에 tx가 추가되서 쌓을때랑 코드가 똑같다. => 분리해야한다.

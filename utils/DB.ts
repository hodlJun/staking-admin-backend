import mariadb from 'mariadb';

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PWD,
  port: 3307,
  database: 'staking-pool',
});

export const getDBPoolLength = async (_db: any, _table: any) => {
  const query = await _db.query(`select count(*) as count from ${_table}`);

  if (query[0] !== undefined) {
    // pool테이블에 데이터 있을시 숫자길이반환
    return Number(query[0].count);
  }
  // pool테이블에 데이터없을시 undefined 반환
  return undefined;
};

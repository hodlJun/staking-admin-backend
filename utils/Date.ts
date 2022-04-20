import Dayjs from 'dayjs';

export const convertToDate = (_date: any) => {
  const result = Dayjs(_date * 1000).format('YYYY-MM-DD'); // yyyy-mm-dd
  return result;
};

export const dayDiff = (_endDate: any, _startDate: any) => {
  const diff = Dayjs(_endDate).diff(_startDate, 'day');

  return diff;
};

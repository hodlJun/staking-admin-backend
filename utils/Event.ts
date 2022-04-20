import { getContract } from '../utils/Web3';

export const getEvents = (
  _genesis: string | number = 'genesis',
  _latest: string | number = 'latest'
) => {
  const contract = getContract();
  const events = contract.getPastEvents('allEvents', {
    fromBlock: _genesis,
    toBlock: _latest,
  });
  return events;
};

export const eventFilter = (_obj: any) => {
  const filterWords = ['Pool', 'Deposit', 'Withdraw'];
  if (filterWords.includes(_obj.event)) {
    return _obj;
  }
};

export const getDepositWithdraw = (_preTxsArray: any) => {
  const event = _preTxsArray.event;
  let pid = '-';
  let amount = '-';

  if (event !== 'Pool') {
    pid = _preTxsArray.returnValues.pid;
    amount = _preTxsArray.returnValues.amount;
  }

  return { pid, amount };
};

export const getReward = async (_pid: any, _address: any) => {
  const contract = getContract();
  let reward = '-';
  const filteredReward = await contract.methods
    .userInfo(_pid, _address)
    .call()
    .then((obj: any) => obj.reward);

  if (filteredReward !== '0') {
    reward = filteredReward;
  }

  return reward;
};

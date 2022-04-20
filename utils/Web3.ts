import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { Contract } from 'web3-eth-contract';
import PoolContractABI from './abi/PoolContract.json';
import ArowanaABI from './abi/ArowanaContract.json';
import dotenv from 'dotenv';
dotenv.config();

export const getWeb3 = () => {
  return new Web3(
    new Web3.providers.HttpProvider(
      'https://mainnet.infura.io/v3/9e46f6a1ade8448fa1741e705f75fe43'
    )
  );
};

const web3 = getWeb3();

export const getContract = (_contractName = 'main') => {
  let ContractABI = PoolContractABI as unknown as AbiItem;
  let Address = process.env.MAINNET_POOL_CONTRACT_ADDRESS;

  if (_contractName === 'arowana') {
    ContractABI = ArowanaABI as unknown as AbiItem;
    Address = process.env.MAINNET_AROWANA_CONTRACT_ADDRESS;
  }

  const contract = new web3.eth.Contract(
    ContractABI as unknown as AbiItem,
    Address
  );

  return contract;
};

export const getBlockNumber = () => {
  return web3.eth.getBlockNumber();
};

export const getBlockInfo = (_blockNumber: any) => {
  return web3.eth.getBlock(_blockNumber);
};

export const getTransactionInfo = (_txHash: any) => {
  return web3.eth.getTransactionReceipt(_txHash);
};

export const getPoolLength = (_contract: Contract) => {
  return _contract.methods.poolLength().call(); // return string
};

export const getPoolInfo = (_contract: Contract, _number: number) => {
  const obj = _contract.methods.poolInfo(_number).call();
  return obj;
};

export const arowanaDecimal = () => {
  const contract = getContract('arowana');
  const result = contract.methods.decimals().call();
  return result;
};

export const decimal = (_wei: any, _decimal: number = 18) => {
  const web3 = getWeb3();
  // 18로 고정하여 계산 추후에 수정
  const result = web3.utils.fromWei(_wei.toString(), 'ether');
  // string타입으로 반환
  return result;
};

import { monadTestnet } from "./chain";
import TaniTraceFundingAbi from "./abis/TaniTraceFunding.json";
import TANITokenAbi from "./abis/TANIToken.json";
import TANIFaucetAbi from "./abis/TANIFaucet.json";

export const EXPLORER_URL = "https://testnet.monadexplorer.com";

export const TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const FUNDING_ADDRESS = (process.env.NEXT_PUBLIC_FUNDING_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const FAUCET_ADDRESS = (process.env.NEXT_PUBLIC_FAUCET_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const isConfigured =
  TOKEN_ADDRESS !== "0x0000000000000000000000000000000000000000" &&
  FUNDING_ADDRESS !== "0x0000000000000000000000000000000000000000" &&
  FAUCET_ADDRESS !== "0x0000000000000000000000000000000000000000";

export const abi = {
  funding: TaniTraceFundingAbi,
  token: TANITokenAbi,
  faucet: TANIFaucetAbi,
};

export { monadTestnet };
export const chain = monadTestnet;
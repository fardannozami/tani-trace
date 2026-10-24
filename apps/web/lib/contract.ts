import { monadTestnet } from "./chain";
import TANITokenAbi from "./abis/TANIToken.json";

export const EXPLORER_URL = "https://testnet.monadexplorer.com";

export const TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const FUNDING_ADDRESS = (process.env.NEXT_PUBLIC_FUNDING_ADDRESS || TOKEN_ADDRESS) as `0x${string}`;
export const FAUCET_ADDRESS = (process.env.NEXT_PUBLIC_FAUCET_ADDRESS || TOKEN_ADDRESS) as `0x${string}`;

export const isConfigured =
  TOKEN_ADDRESS !== "0x0000000000000000000000000000000000000000";

export const abi = {
  funding: TANITokenAbi,
  token: TANITokenAbi,
  faucet: TANITokenAbi,
};

export { monadTestnet };
export const chain = monadTestnet;

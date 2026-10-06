import {
  createPublicClient,
  http,
  parseAbiItem,
  decodeFunctionResult,
  encodeFunctionData,
  formatEther,
  formatUnits,
} from 'viem';

import { robinhoodTestnet, CONTRACTS, DEPLOY_BLOCK, CHUNK } from './config';
import {
  factoryAbi,
  curveAbi,
  tokenAbi,
  multicallAbi,
} from './abis';

export const publicClient = createPublicClient({
  chain: robinhoodTestnet,
  transport: http(robinhoodTestnet.rpcUrls.default.http[0]),
});

export type TokenInfo = {
  token: `0x${string}`;
  curve: `0x${string}`;
  deployer: `0x${string}`;
  pairToken: `0x${string}`;
  name: string;
  symbol: string;
  logo: string;
  quoteReserve: bigint;
  tokenReserve: bigint;
  realQuoteReserve: bigint;
  graduationThreshold: bigint;
  feeBps: bigint;
  creatorTaxBps: bigint;
  phase: number;
  price: string;
  progressBps: bigint;
};

const launchedEvent = parseAbiItem(
  'event TokenLaunched(address indexed token,address indexed curve,address indexed deployer,address pairToken,uint256 launchConfigId,uint256 graduationThreshold)'
);

type RawToken = {
  token: `0x${string}`;
  curve: `0x${string}`;
  deployer: `0x${string}`;
  pairToken: `0x${string}`;
};

type MulticallResult = {
  success: boolean;
  returnData: `0x${string}`;
};

export async function scanTokens(): Promise<RawToken[]> {
  const latest = await publicClient.getBlockNumber();

  const out = new Map<string, RawToken>();

  for (
    let from = BigInt(DEPLOY_BLOCK);
    from <= latest;
    from += BigInt(CHUNK)
  ) {
    const chunkEnd = from + BigInt(CHUNK) - 1n;
    const to = chunkEnd > latest ? latest : chunkEnd;

    const logs = await publicClient.getLogs({
      address: CONTRACTS.factory,
      event: launchedEvent,
      fromBlock: from,
      toBlock: to,
    });

    for (const log of logs) {
      const args = log.args;

      if (!args.token || !args.curve) {
        continue;
      }

      out.set(args.token.toLowerCase(), {
        token: args.token,
        curve: args.curve,
        deployer: args.deployer ?? '0x0000000000000000000000000000000000000000',
        pairToken:
          args.pairToken ??
          '0x0000000000000000000000000000000000000000',
      });
    }
  }

  return Array.from(out.values());
}

export async function loadTokens(): Promise<TokenInfo[]> {
  const raw = await scanTokens();

  if (raw.length === 0) {
    return [];
  }

  const calls = raw.flatMap((token) => [
    ...(['name', 'symbol', 'logo'] as const).map((functionName) => ({
      target: token.token,
      allowFailure: true,
      callData: encodeFunctionData({
        abi: tokenAbi,
        functionName,
      }),
    })),

    ...(
      [
        'getReserves',
        'realQuoteReserve',
        'graduationThreshold',
        'feeBps',
        'creatorTaxBps',
      ] as const
    ).map((functionName) => ({
      target: token.curve,
      allowFailure: true,
      callData: encodeFunctionData({
        abi: curveAbi,
        functionName,
      }),
    })),

    {
      target: CONTRACTS.factory,
      allowFailure: true,
      callData: encodeFunctionData({
        abi: factoryAbi,
        functionName: 'getLaunchedToken',
        args: [token.token],
      }),
    },
  ]);

  const res = (await publicClient.readContract({
    address: CONTRACTS.multicall3,
    abi: multicallAbi,
    functionName: 'aggregate3',
    args: [calls],
  })) as MulticallResult[];

  const decoded: (`0x${string}` | null)[] = res.map((result) =>
    result.success ? result.returnData : null
  );

  const list: TokenInfo[] = [];

  let k = 0;

  for (const token of raw) {
    const nameData = decoded[k++];
    const symbolData = decoded[k++];
    const logoData = decoded[k++];

    const reservesData = decoded[k++];
    const realReserveData = decoded[k++];
    const thresholdData = decoded[k++];
    const feeData = decoded[k++];
    const taxData = decoded[k++];
    const launchedData = decoded[k++];

    const name = nameData
      ? (decodeFunctionResult({
          abi: tokenAbi,
          functionName: 'name',
          data: nameData,
        }) as string)
      : 'Unknown';

    const symbol = symbolData
      ? (decodeFunctionResult({
          abi: tokenAbi,
          functionName: 'symbol',
          data: symbolData,
        }) as string)
      : 'TOKEN';

    const logo = logoData
      ? (decodeFunctionResult({
          abi: tokenAbi,
          functionName: 'logo',
          data: logoData,
        }) as string)
      : '';

    let quoteReserve = 0n;
    let tokenReserve = 0n;

    if (reservesData) {
      const reserves = decodeFunctionResult({
        abi: curveAbi,
        functionName: 'getReserves',
        data: reservesData,
      }) as readonly [bigint, bigint];

      quoteReserve = reserves[0];
      tokenReserve = reserves[1];
    }

    const realQuoteReserve = realReserveData
      ? (decodeFunctionResult({
          abi: curveAbi,
          functionName: 'realQuoteReserve',
          data: realReserveData,
        }) as bigint)
      : 0n;

    const graduationThreshold = thresholdData
      ? (decodeFunctionResult({
          abi: curveAbi,
          functionName: 'graduationThreshold',
          data: thresholdData,
        }) as bigint)
      : 0n;

    const feeBps = feeData
      ? (decodeFunctionResult({
          abi: curveAbi,
          functionName: 'feeBps',
          data: feeData,
        }) as bigint)
      : 0n;

    const creatorTaxBps = taxData
      ? (decodeFunctionResult({
          abi: curveAbi,
          functionName: 'creatorTaxBps',
          data: taxData,
        }) as bigint)
      : 0n;

    const launched = launchedData
      ? (decodeFunctionResult({
          abi: factoryAbi,
          functionName: 'getLaunchedToken',
          data: launchedData,
        }) as { phase?: bigint | number })
      : null;

    const phaseValue = launched?.phase ?? 0;

    const phase =
      typeof phaseValue === 'bigint'
        ? Number(phaseValue)
        : Number(phaseValue);

    let progressBps = 0n;

    if (graduationThreshold > 0n) {
      progressBps =
        (realQuoteReserve * 10000n) / graduationThreshold;

      if (progressBps > 10000n) {
        progressBps = 10000n;
      }
    }

    const price =
      tokenReserve > 0n
        ? formatEther(
            (quoteReserve * 10n ** 18n) / tokenReserve
          )
        : '0';

    list.push({
      ...token,
      name,
      symbol,
      logo,
      quoteReserve,
      tokenReserve,
      realQuoteReserve,
      graduationThreshold,
      feeBps,
      creatorTaxBps,
      phase,
      price,
      progressBps,
    });
  }

  return list;
}

export function estimate(
  quoteIn: bigint,
  token: TokenInfo
): {
  tokensOut: bigint;
  minTokensOut: bigint;
} {
  if (
    quoteIn <= 0n ||
    token.quoteReserve <= 0n ||
    token.tokenReserve <= 0n
  ) {
    return {
      tokensOut: 0n,
      minTokensOut: 0n,
    };
  }

  const fee =
    (quoteIn * token.feeBps) / 10000n;

  const creatorTax =
    (quoteIn * token.creatorTaxBps) / 10000n;

  const net =
    quoteIn - fee - creatorTax;

  if (net <= 0n) {
    return {
      tokensOut: 0n,
      minTokensOut: 0n,
    };
  }

  const tokensOut =
    (net * token.tokenReserve) /
    (token.quoteReserve + net);

  return {
    tokensOut,
    minTokensOut: tokensOut,
  };
}

export const fmtEth = (value: bigint): string => {
  const formatted = formatEther(value);

  if (Number(formatted) < 0.000001) {
    return formatted;
  }

  return Number(formatted)
    .toFixed(6)
    .replace(/0+$/, '')
    .replace(/\.$/, '');
};

export const fmtToken = (value: bigint): string =>
  formatUnits(value, 18);

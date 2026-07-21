const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const quantity = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 4 });
const percent = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
export const formatUsd = (value: number) => usd.format(value);
export const formatQuantity = (value: number) => quantity.format(value);
export const formatPercent = (value: number) => `${percent.format(value)}%`;
export const pluralize = (count: number, word: string) => `${count} ${count === 1 ? word : `${word}s`}`;
export const shortenAddress = (value: string) => value.length <= 13 ? value : `${value.slice(0, 6)}…${value.slice(-4)}`;

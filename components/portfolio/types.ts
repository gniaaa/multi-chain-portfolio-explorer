import type { GroupBy, GroupedPortfolioRow, PortfolioSummaryViewModel, RequestFailureViewModel } from "@/lib/portfolio/contracts";

export interface PortfolioWalletSummaryViewModel { readonly id: string; readonly label: string; readonly address: string; readonly totalValueUsd: number; readonly assetCount: number; readonly networkCount: number; readonly isIncomplete: boolean }
export interface PortfolioSummaryProps { readonly summary: Readonly<PortfolioSummaryViewModel> }
export interface WalletSummaryProps { readonly wallets: readonly Readonly<PortfolioWalletSummaryViewModel>[] }
export interface PortfolioSearchProps { readonly value: string; readonly onChange: (value: string) => void; readonly resultCount?: number }
export interface GroupByControlProps { readonly value: GroupBy; readonly onChange: (value: GroupBy) => void }
export interface PortfolioTableProps { readonly rows: readonly Readonly<GroupedPortfolioRow>[]; readonly groupBy: GroupBy; readonly caption?: string }
export interface ProvenanceBadgeProps { readonly provider: string; readonly providerAssetId?: string }
export interface PortfolioLoadingSkeletonProps { readonly rowCount?: number }
export interface PortfolioEmptyStateProps { readonly title?: string; readonly description?: string }
export interface PortfolioFilteredEmptyStateProps { readonly query: string; readonly onClear: () => void }
export interface PortfolioPartialWarningProps { readonly failures: readonly Readonly<RequestFailureViewModel>[]; readonly onRetry: () => void; readonly isRetrying?: boolean }
export interface PortfolioTotalErrorProps { readonly failures: readonly Readonly<RequestFailureViewModel>[]; readonly onRetry: () => void; readonly isRetrying?: boolean }

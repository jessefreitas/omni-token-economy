export interface Telemetry {
  bytesBefore: number;
  bytesAfter: number;
  tokensBefore: number;
  tokensAfter: number;
  tokensSaved: number;
  reductionPercent: number;
}

export interface WithTelemetry<T> {
  value: T;
  metrics: Telemetry;
}

export type TimestampPrecision = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second';

export interface CompactRules {
  /** Field pairs where the first is dropped if redundant with the second. */
  redundantPairs?: Array<[string, string]>;
  /** Fields always dropped. */
  dropFields?: string[];
  /** Fields kept. If provided, everything else is dropped. Mutually exclusive with dropFields semantics — whitelist wins when both set. */
  whitelistFields?: string[];
  /** Fields whose value is a timestamp string to be truncated. */
  timestampFields?: string[];
  /** Precision for timestamp truncation. Default: 'minute'. */
  timestampPrecision?: TimestampPrecision;
  /** Tag prefix patterns to strip from arrays (e.g., ['project:']). Applied to fields named 'tags' by default. */
  stripTagPrefixes?: string[];
  /** Custom field containing tags. Default: 'tags'. */
  tagsField?: string;
  /** Threshold for summary↔content redundancy. Default: 0.6. */
  redundancyThreshold?: number;
}

export interface CompressContextOptions {
  /** Total estimated token budget. Default: 3000. */
  maxTokens?: number;
  /** Number of items kept fully verbatim at the front. Default: 5. */
  keepFullFirst?: number;
  /** Field treated as the verbose body to drop when compressing. Default: 'content'. */
  contentField?: string;
  /** Field kept as the short replacement. Default: 'summary'. */
  summaryField?: string;
  /** Max chars kept from summary. Default: 300. */
  summaryMaxChars?: number;
  /** Emit telemetry. Default: false. */
  telemetry?: boolean;
}

export interface CompressContextResult<T> {
  items: T[];
  compressed: boolean;
  metrics?: Telemetry;
}

export interface CompactSecretOptions {
  /** Fields allowed in output. All others dropped, including the secret value. */
  whitelist: string[];
}

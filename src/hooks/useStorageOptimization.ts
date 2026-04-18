/**
 * Dataset Compression Utility for Offline Storage
 * Reduces storage footprint using LZ4 compression and delta encoding
 * Maximizes IndexedDB 50MB capacity for large offline datasets
 */

/**
 * Simple LZ4-like compression using run-length encoding
 * Note: This is a simplified version; production should use a proper LZ4 library
 */
class SimpleCompressionCodec {
  /**
   * Compress data using run-length encoding and delta coding
   */
  static compress(data: any[]): string {
    try {
      // Serialize to JSON
      const json = JSON.stringify(data);
      
      // Apply simple run-length encoding
      let compressed = '';
      let count = 1;
      
      for (let i = 0; i < json.length; i++) {
        const current = json[i];
        const next = json[i + 1];
        
        if (current === next && count < 255) {
          count++;
        } else {
          if (count > 3) {
            // Use compression for runs longer than 3 characters
            compressed += `\x00${String.fromCharCode(count)}${current}`;
          } else {
            // For short runs, store as-is
            compressed += current.repeat(count);
          }
          count = 1;
        }
      }
      
      return btoa(compressed); // Base64 encode
    } catch (error) {
      console.error('[Compression] Compression failed:', error);
      return btoa(JSON.stringify(data)); // Fallback to simple base64
    }
  }

  /**
   * Decompress data
   */
  static decompress(compressedData: string): any[] {
    try {
      const decompressed = atob(compressedData);
      
      let result = '';
      let i = 0;
      
      while (i < decompressed.length) {
        if (decompressed[i] === '\x00') {
          // Run-length encoded sequence
          const count = decompressed.charCodeAt(i + 1);
          const char = decompressed[i + 2];
          result += char.repeat(count);
          i += 3;
        } else {
          result += decompressed[i];
          i++;
        }
      }
      
      return JSON.parse(result);
    } catch (error) {
      console.error('[Compression] Decompression failed:', error);
      return [];
    }
  }
}

/**
 * Delta encoding for vital sign series
 * Stores only differences from previous value to reduce size
 */
class DeltaCodec {
  static encodeVitalsSeries(vitals: any[]): string {
    if (vitals.length === 0) return '';

    const deltas: number[] = [];
    let prev = 0;

    for (const vital of vitals) {
      const value = vital.systolic_bp || 0;
      deltas.push(value - prev);
      prev = value;
    }

    return btoa(JSON.stringify(deltas));
  }

  static decodeVitalsSeries(encoded: string): number[] {
    try {
      const deltas = JSON.parse(atob(encoded));
      const values: number[] = [];
      let current = 0;

      for (const delta of deltas) {
        current += delta;
        values.push(current);
      }

      return values;
    } catch (error) {
      console.error('[DeltaCodec] Decode failed:', error);
      return [];
    }
  }
}

/**
 * Storage optimizer for offline data
 */
export class OfflineStorageOptimizer {
  private readonly TARGET_SIZE_MB = 40; // Target 40MB of 50MB available
  private readonly THRESHOLD_MB = 45; // Compress when > 45MB

  /**
   * Get estimated size of data in bytes
   */
  private static getDataSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  /**
   * Check if storage optimization is needed
   */
  async shouldOptimize(): Promise<boolean> {
    if (!navigator.storage || !navigator.storage.estimate) {
      return false;
    }

    try {
      const estimate = await navigator.storage.estimate();
      const usedMB = (estimate.usage || 0) / (1024 * 1024);
      return usedMB > this.THRESHOLD_MB;
    } catch (error) {
      console.error('[StorageOptimizer] Could not get storage estimate:', error);
      return false;
    }
  }

  /**
   * Compress and store vital signs
   */
  compressVitals(vitals: any[]): { compressed: string; ratio: number } {
    const original = JSON.stringify(vitals);
    const originalSize = original.length;

    const compressed = SimpleCompressionCodec.compress(vitals);
    const compressedSize = compressed.length;

    const ratio = (1 - compressedSize / originalSize) * 100;

    console.log(
      `[StorageOptimizer] Vitals: ${originalSize} → ${compressedSize} bytes (${ratio.toFixed(1)}% reduction)`
    );

    return { compressed, ratio };
  }

  /**
   * Decompress vital signs
   */
  decompressVitals(compressed: string): any[] {
    return SimpleCompressionCodec.decompress(compressed);
  }

  /**
   * Prune old offline data
   */
  pruneOldData(data: any[], daysToKeep: number = 30): any[] {
    const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

    return data.filter((item: any) => {
      const itemTime = new Date(item.captured_at || item.created_at).getTime();
      return itemTime > cutoffTime;
    });
  }

  /**
   * Archive compressed data for backup
   */
  createArchive(
    vitals: any[],
    medications: any[],
    patients: any[]
  ): { archived: string; stats: any } {
    const archive = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      vitals: SimpleCompressionCodec.compress(vitals),
      medications: SimpleCompressionCodec.compress(medications),
      patients: SimpleCompressionCodec.compress(patients)
    };

    const stats = {
      vitalCount: vitals.length,
      medicationCount: medications.length,
      patientCount: patients.length,
      originalSize: OfflineStorageOptimizer.getDataSize({ vitals, medications, patients }),
      compressedSize: OfflineStorageOptimizer.getDataSize(archive),
      compressionRatio: 0
    };

    stats.compressionRatio = (
      (1 - stats.compressedSize / stats.originalSize) * 100
    );

    return {
      archived: JSON.stringify(archive),
      stats
    };
  }

  /**
   * Extract archived data
   */
  extractArchive(archivedData: string): {
    vitals: any[];
    medications: any[];
    patients: any[];
  } {
    try {
      const archive = JSON.parse(archivedData);

      return {
        vitals: SimpleCompressionCodec.decompress(archive.vitals),
        medications: SimpleCompressionCodec.decompress(archive.medications),
        patients: SimpleCompressionCodec.decompress(archive.patients)
      };
    } catch (error) {
      console.error('[StorageOptimizer] Archive extraction failed:', error);
      return { vitals: [], medications: [], patients: [] };
    }
  }

  /**
   * Estimate storage savings
   */
  estimateCompressionBenefit(data: any[]): {
    beforeMB: number;
    afterMB: number;
    savedMB: number;
  } {
    const before = OfflineStorageOptimizer.getDataSize(data);
    const compressed = SimpleCompressionCodec.compress(data);
    const after = OfflineStorageOptimizer.getDataSize(compressed);

    return {
      beforeMB: before / (1024 * 1024),
      afterMB: after / (1024 * 1024),
      savedMB: (before - after) / (1024 * 1024)
    };
  }
}

// Export singleton
export const storageOptimizer = new OfflineStorageOptimizer();

/**
 * React hook for storage optimization
 */
export function useStorageOptimization() {
  const optimize = async (vitals: any[], medications: any[], patients: any[]) => {
    try {
      const shouldOptimize = await storageOptimizer.shouldOptimize();

      if (!shouldOptimize) {
        console.log('[StorageOptimization] No optimization needed');
        return { optimized: false };
      }

      const archive = storageOptimizer.createArchive(vitals, medications, patients);

      console.log('[StorageOptimization] Compression stats:', archive.stats);

      // Store compressed archive
      localStorage.setItem('offline_data_archive', archive.archived);

      return {
        optimized: true,
        stats: archive.stats
      };
    } catch (error) {
      console.error('[StorageOptimization] Optimization failed:', error);
      return { optimized: false, error };
    }
  };

  const estimateBenefit = (data: any[]) => {
    return storageOptimizer.estimateCompressionBenefit(data);
  };

  return { optimize, estimateBenefit };
}

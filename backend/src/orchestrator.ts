import type {
  DataProvider,
  TrainDetail,
  LiveTrainStatus,
  TrainBetweenResult,
  StationDetail,
  StationBoardTrain,
} from './types/index.js';
import { log, logError } from './lib/utils.js';

/**
 * Orchestrator calls providers in priority order.
 * First successful non-null result wins.
 */
export class ProviderChain implements DataProvider {
  readonly name = 'ProviderChain';
  private providers: DataProvider[];

  constructor(providers: DataProvider[]) {
    this.providers = providers;
    log('ProviderChain', `Initialized with providers: ${providers.map((p) => p.name).join(' → ')}`);
  }

  async getTrainSchedule(trainNumber: string): Promise<TrainDetail | null> {
    return this.tryProviders('getTrainSchedule', trainNumber);
  }

  async getTrainLiveStatus(trainNumber: string, journeyDate: string): Promise<LiveTrainStatus | null> {
    return this.tryProviders('getTrainLiveStatus', trainNumber, journeyDate);
  }

  async getTrainsBetween(fromCode: string, toCode: string): Promise<TrainBetweenResult[]> {
    return (await this.tryProviders('getTrainsBetween', fromCode, toCode)) || [];
  }

  async getStationDetail(stationCode: string): Promise<StationDetail | null> {
    return this.tryProviders('getStationDetail', stationCode);
  }

  async getStationBoard(stationCode: string): Promise<StationBoardTrain[]> {
    return (await this.tryProviders('getStationBoard', stationCode)) || [];
  }

  private async tryProviders(method: string, ...args: any[]): Promise<any> {
    for (const provider of this.providers) {
      const fn = (provider as any)[method];
      if (typeof fn !== 'function') continue;

      try {
        const result = await fn.call(provider, ...args);
        if (result != null && (!Array.isArray(result) || result.length > 0)) {
          log('ProviderChain', `${method} served by ${provider.name}`);
          return result;
        }
      } catch (err) {
        logError('ProviderChain', `${provider.name}.${method} failed, trying next`, err);
      }
    }
    log('ProviderChain', `${method} returned null from all providers`);
    return null;
  }
}

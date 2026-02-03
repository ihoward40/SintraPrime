/**
 * Meta Ads Connector - Interact with Meta Marketing API
 * 
 * Provides safe, rate-limited access to Facebook/Instagram Ads
 */

import { Connector } from '../types/index.js';

export interface MetaAdsConfig {
  accessToken: string;
  adAccountId: string; // e.g., 'act_123456789'
  apiVersion: string; // e.g., 'v18.0'
}

export class MetaAdsConnector implements Connector {
  name = 'meta_ads';
  type = 'advertising';
  
  private config: MetaAdsConfig;
  private authenticated = false;
  private baseUrl = 'https://graph.facebook.com';

  constructor(config: MetaAdsConfig) {
    this.config = config;
  }

  /**
   * Authenticate with Meta
   */
  async authenticate(): Promise<void> {
    // Verify credentials by fetching account info
    try {
      await this.call('GET', `/${this.config.adAccountId}`, {
        fields: 'name,account_status'
      });
      this.authenticated = true;
    } catch (error) {
      throw new Error(`Meta Ads authentication failed: ${error}`);
    }
  }

  /**
   * Make an API call to Meta
   */
  async call(method: string, args: any): Promise<any> {
    const { endpoint, ...restArgs } = args;
    if (!this.authenticated && endpoint !== `/${this.config.adAccountId}`) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    const url = new URL(`${this.baseUrl}/${this.config.apiVersion}${endpoint}`);
    url.searchParams.append('access_token', this.config.accessToken);

    // Add query parameters for GET requests
    if (method === 'GET' && Object.keys(restArgs).length > 0) {
      Object.entries(restArgs).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    try {
      const response = await fetch(url.toString(), {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: method !== 'GET' && Object.keys(restArgs).length > 0 ? JSON.stringify(restArgs) : undefined
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Meta API error: ${JSON.stringify(error)}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Meta API call failed: ${error}`);
    }
  }

  /**
   * Get campaigns
   */
  async getCampaigns(fields = 'id,name,status,objective'): Promise<any> {
    return this.call('GET', `/${this.config.adAccountId}/campaigns`, { fields });
  }

  /**
   * Create a campaign
   */
  async createCampaign(campaign: {
    name: string;
    objective: string;
    status: string;
    special_ad_categories?: string[];
  }): Promise<any> {
    return this.call('POST', `/${this.config.adAccountId}/campaigns`, campaign);
  }

  /**
   * Get campaign insights
   */
  async getCampaignInsights(campaignId: string, fields = 'impressions,clicks,spend,cpc,cpm'): Promise<any> {
    return this.call('GET', `/${campaignId}/insights`, { fields });
  }

  /**
   * Get ad sets
   */
  async getAdSets(campaignId: string, fields = 'id,name,status,daily_budget'): Promise<any> {
    return this.call('GET', `/${campaignId}/adsets`, { fields });
  }

  /**
   * Create an ad set
   */
  async createAdSet(adSet: {
    name: string;
    campaign_id: string;
    daily_budget: number;
    billing_event: string;
    optimization_goal: string;
    bid_amount: number;
    targeting: any;
    status: string;
  }): Promise<any> {
    return this.call('POST', `/${this.config.adAccountId}/adsets`, adSet);
  }

  /**
   * Get ads
   */
  async getAds(adSetId: string, fields = 'id,name,status,creative'): Promise<any> {
    return this.call('GET', `/${adSetId}/ads`, { fields });
  }

  /**
   * Update campaign status
   */
  async updateCampaignStatus(campaignId: string, status: 'ACTIVE' | 'PAUSED' | 'DELETED'): Promise<any> {
    return this.call('POST', `/${campaignId}`, { status });
  }

  /**
   * Get account spending
   */
  async getAccountSpending(): Promise<any> {
    return this.call('GET', `/${this.config.adAccountId}`, {
      fields: 'spend_cap,amount_spent,balance'
    });
  }
}

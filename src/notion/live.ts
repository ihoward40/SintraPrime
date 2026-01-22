import type { NotionHttp } from "./http.js";

export interface NotionDatabaseQueryRequest {
  filter?: any;
  sorts?: any[];
  page_size?: number;
  start_cursor?: string;
}

export interface NotionDatabaseQueryResponse {
  results: any[];
  has_more: boolean;
  next_cursor: string | null;
}

export class NotionLive {
  constructor(private http: NotionHttp) {}

  get<T>(path: string): Promise<T> {
    return this.http.get<T>(path);
  }

  queryDatabase(dbId: string, body: NotionDatabaseQueryRequest) {
    return this.http.post<NotionDatabaseQueryResponse>(`/v1/databases/${dbId}/query`, body);
  }

  createPage(body: any) {
    return this.http.post<any>(`/v1/pages`, body);
  }

  updatePage(pageId: string, body: any) {
    return this.http.patch<any>(`/v1/pages/${pageId}`, body);
  }
}

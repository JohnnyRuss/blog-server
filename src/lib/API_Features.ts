import { ParsedUrlQuery } from "querystring";
import { Document, Query } from "mongoose";
import API_FeatureUtils from "./API_FeatureUtils";

class API_Features<
  T extends Query<Array<Document>, Document>,
  Q extends ParsedUrlQuery
> extends API_FeatureUtils {
  dbQuery: T;
  dbQueryClone: T;
  query: Q;

  currentPage: number = 1;
  pagesCount: number = 1;
  docsCount: number = 0;

  constructor(dbQuery: T, query: Q) {
    super(query);
    this.dbQuery = dbQuery;
    this.dbQueryClone = dbQuery.clone();
    this.query = query;
  }

  paginate(max?: number) {
    const { currentPage, limit, skip } = this.getPaginationInfo(max);

    this.currentPage = currentPage;

    this.dbQuery = this.dbQuery.skip(skip).limit(limit);

    return this;
  }

  filterArticles() {
    const query = this.getArticlesQueryObject();

    this.dbQuery = this.dbQuery.find(query) as any;
    this.dbQueryClone = this.dbQueryClone.find(query) as any;

    return this;
  }

  sort(sort?: string | { [key: string]: 1 | -1 }) {
    const sortQuery = (this.query.sort as string) || sort || "-createdAt";

    this.dbQuery = this.dbQuery.sort(sortQuery);

    return this;
  }

  async countDocuments(manualLimit?: number) {
    const { limit } = this.query;

    const paginationLimit = limit
      ? Number(limit)
      : manualLimit
      ? manualLimit
      : 10;

    const docsCount = await this.dbQueryClone.countDocuments();
    const pagesCount = Math.ceil(docsCount / paginationLimit);

    this.pagesCount = pagesCount;
    this.docsCount = docsCount;

    return this;
  }

  getQuery() {
    return this.dbQuery;
  }
}

export default API_Features;

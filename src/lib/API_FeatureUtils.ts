import { ParsedUrlQuery } from "querystring";

class API_FeatureUtils {
  query: ParsedUrlQuery = {};

  constructor(query: ParsedUrlQuery) {
    this.query = query;
  }

  getQueryObject(keys: string[], arrayKeys: string[]) {
    let convertedFilter: { [key: string]: string | Array<string> | number } =
      {};

    Object.keys(this.query)
      .filter((key: string) => keys.includes(key))
      .forEach((key: string) => {
        if (this.query[key] !== undefined) {
          const value = this.query[key] as string;

          convertedFilter[key] = arrayKeys.includes(key)
            ? value.split(",")
            : value;
        }
      });

    convertedFilter = JSON.parse(
      JSON.stringify(convertedFilter).replace(
        /gt|gte|lt|lte/g,
        (match) => `$${match}`
      )
    );

    const queryObject: { [key: string]: any } = {};

    for (const [key, value] of Object.entries(convertedFilter)) {
      queryObject[key] = value;
    }

    return queryObject;
  }

  getArticlesQueryObject() {
    const queryObject = this.getQueryObject(["search", "picked"], []);

    const query: { [key: string]: any } = {};

    if (queryObject.search)
      query["$or"] = [
        { slug: { $regex: queryObject.search, $options: "i" } },
        { title: { $regex: queryObject.search, $options: "i" } },
      ];

    if (queryObject.picked) query.picked = true;

    return query;
  }

  getAggregationSortQueryObject(): Record<string, 1 | -1> {
    const sortQuery = this.query.sort as string;

    const sortObject: { [key: string]: 1 | -1 } = {};

    const sortFragments = sortQuery?.split(",") || [];

    if (sortFragments.length > 0) {
      sortFragments.forEach((fragment) => {
        sortObject[fragment.replace("-", "")] = fragment.startsWith("-")
          ? -1
          : 1;
      });
    } else {
      sortObject.createdAt = -1;
    }

    return sortObject;
  }

  getPaginationInfo(max?: number) {
    const { page, limit } = this.query;

    const pageNum = page ? Number(page) : 1;
    const paginationLimit = limit ? Number(limit) : max ? max : 10;

    return {
      currentPage: pageNum,
      limit: paginationLimit,
      skip: (pageNum - 1) * paginationLimit,
    };
  }
}

export default API_FeatureUtils;

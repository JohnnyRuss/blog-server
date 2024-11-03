import { ArticleT } from "../../types/models/article.types";
import { UserTraceT } from "../../types/models/userTrace.types";

export const trackViews = async (article: ArticleT, sessionId: string) => {
  const now = new Date();
  const bucketKey = now.toISOString().slice(0, 13);

  // Check last view timestamp and enforce a coolDown period (e.g., 1 minute)
  const lastViewed = article.lastViewedSessions.get(sessionId);
  const coolDown = 1 * 60 * 1000;

  if (lastViewed && now.getTime() - new Date(lastViewed).getTime() < coolDown)
    return;

  // Update last viewed time
  article.lastViewedSessions.set(sessionId, now);

  // Update view counter for the current bucket
  if (!article.viewBuckets.get(bucketKey))
    article.viewBuckets.set(bucketKey, 0);

  const currentValue = article.viewBuckets.get(bucketKey) || 0;
  article.viewBuckets.set(bucketKey, currentValue + 1);

  // Increment total views
  article.views += 1;

  // Trim old buckets (older than your sliding window, e.g., 24 hours)
  const expiration = new Date(now);
  expiration.setHours(expiration.getHours() - 1);
  // expiration.setMinutes(expiration.getMinutes() - 5 // to clean up in minutes instead of hours
  for (const key in article.viewBuckets) {
    if (new Date(key) < expiration) {
      article.viewBuckets.delete(key);
    }
  }

  for (const [sessionKey, sessionDate] of article.lastViewedSessions) {
    if (new Date(sessionDate) < expiration) {
      article.lastViewedSessions.delete(sessionKey);
    }
  }

  // Save updated article data to database
  await article.save();
};

export const trackUserHistory = (
  trace: UserTraceT,
  articleId: string,
  traceQuery: { [key: string]: any }
) => {
  const articleChronicle = trace.history.filter(
    (history) => history.article.toString() === articleId
  );

  const lastInChronicle = articleChronicle[articleChronicle.length - 1];

  const oneDayInMilliseconds = 24 * 60 * 60 * 1000;

  const isMoreThenOneDay = () =>
    lastInChronicle &&
    Math.abs(Date.now() - new Date(lastInChronicle.readAt).getTime()) >
      oneDayInMilliseconds;

  const isAllowedToPush = !lastInChronicle || isMoreThenOneDay();

  if (isAllowedToPush)
    traceQuery["$push"] = {
      history: { article: articleId, readAt: new Date() },
    };
};

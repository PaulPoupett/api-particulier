import {ApplicationId} from 'src/domain/application-id';
import {Subscription} from '../application.aggregate';

export class ApplicationNotSubscribedError extends Error {
  constructor(applicationId: ApplicationId, subscription: Subscription) {
    super(`${applicationId} has not subscribed to ${subscription}`);
  }
}

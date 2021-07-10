import {ApplicationNotSubscribedError} from 'src/domain/gateway/errors/application-not-subscribed.error';
import {Token} from 'src/domain/gateway/token';
import {TokenFactory} from 'src/domain/gateway/token.factory';
import {ApplicationId} from 'src/domain/gateway/application-id';
import {CNAFDataProvider} from 'src/domain/gateway/data-providers/cnaf/data-provider';
import {
  CNAFInput,
  CNAFOutput,
} from 'src/domain/gateway/data-providers/cnaf/dto';
import {DGFIPDataProvider} from 'src/domain/gateway/data-providers/dgfip/data-provider';
import {
  DGFIPInput,
  DGFIPOutput,
} from 'src/domain/gateway/data-providers/dgfip/dto';
import {PropertyBasedScopesFilter} from 'src/domain/gateway/scopes-filters/property-based.scopes-filter';
import {AnyScope, unifiedScopesConfiguration} from 'src/domain/gateway/scopes';
import {AggregateRoot} from 'src/domain/aggregate-root';
import {ApplicationEvent} from 'src/domain/gateway/events/application.event';
import {ApplicationCreated} from 'src/domain/gateway/events/application-created.event';
import {UserEmail} from 'src/domain/gateway/user';
import {UserSubscribed} from 'src/domain/gateway/events/user-subscribed.event';
import {TokenCreated} from 'src/domain/gateway/events/token-created.event';
import {DataProvider} from 'src/domain/gateway/data-providers/data-provider';
import {DataProviderResponse} from 'src/domain/gateway/data-providers/dto';
import {UuidFactory} from 'src/domain/uuid.factory';
import {ApplicationCache} from 'src/domain/gateway/projections/application-cache';

export type Subscription = 'DGFIP' | 'CNAF';

const propertyBasedScopesFilter = new PropertyBasedScopesFilter(
  unifiedScopesConfiguration
);

export class Application extends AggregateRoot<ApplicationEvent> {
  public id!: ApplicationId;
  public name!: string;
  public createdOn!: Date;
  public dataPassId!: string;
  public tokens!: Token[];
  public subscriptions!: Subscription[];
  public userEmails!: UserEmail[];
  private scopes!: AnyScope[];

  private constructor() {
    super();
  }

  static fromCache(cache: ApplicationCache): Application {
    const self = new this();
    self.id = cache.id;
    self.name = cache.name;
    self.createdOn = cache.createdOn;
    self.dataPassId = cache.dataPassId;
    self.tokens = cache.tokens;
    self.subscriptions = cache.subscriptions;
    self.userEmails = cache.userEmails;
    self.scopes = cache.scopes;

    return self;
  }

  static create(
    name: string,
    dataPassId: string,
    subscriptions: Subscription[],
    scopes: AnyScope[],
    userEmails: UserEmail[],
    uuidFactory: UuidFactory
  ): Application {
    const self = new this();

    const applicationCreatedEvent = new ApplicationCreated(
      uuidFactory.generateUuid() as ApplicationId,
      new Date(),
      name,
      dataPassId,
      scopes,
      subscriptions,
      userEmails
    );
    self.raiseAndApply(applicationCreatedEvent);

    return self;
  }

  generateNewToken(tokenFactory: TokenFactory) {
    const token = tokenFactory.generateToken();
    const event = new TokenCreated(this.id, new Date(), token);

    this.raiseAndApply(event);
  }

  subscribeUser(userEmail: UserEmail) {
    const event = new UserSubscribed(this.id, new Date(), userEmail);

    this.raiseAndApply(event);
  }

  async consumeDGFIP(
    input: DGFIPInput,
    provider: DGFIPDataProvider
  ): Promise<Partial<DGFIPOutput>> {
    return this.callDataProvider(input, 'DGFIP', provider);
  }

  async consumeCNAF(
    input: CNAFInput,
    provider: CNAFDataProvider
  ): Promise<Partial<CNAFOutput>> {
    return this.callDataProvider(input, 'CNAF', provider);
  }

  private async callDataProvider<I, O extends DataProviderResponse>(
    input: I,
    neededSubscription: Subscription,
    provider: DataProvider<I, O>
  ) {
    if (!this.subscriptions.includes(neededSubscription)) {
      throw new ApplicationNotSubscribedError(this, neededSubscription);
    }
    const unfilteredData = await provider.fetch(input);
    return propertyBasedScopesFilter.filter(this.scopes, unfilteredData);
  }

  private applyApplicationCreated(event: ApplicationCreated) {
    this.id = event.aggregateId as ApplicationId;
    this.name = event.name;
    this.dataPassId = event.dataPassId;
    this.createdOn = event.date;
    this.scopes = event.scopes;
    this.subscriptions = event.subscriptions;
    this.userEmails = event.userEmails;
    this.tokens = [];
  }

  private applyUserSubscribed(event: UserSubscribed) {
    this.userEmails.push(event.userEmail);
  }

  private applyTokenCreated(event: TokenCreated) {
    this.tokens.push(event.token);
  }
}

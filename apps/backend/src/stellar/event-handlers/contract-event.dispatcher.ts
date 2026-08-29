import { Injectable, Logger } from '@nestjs/common';
import { SorobanRpc } from '@stellar/stellar-sdk';

export interface ContractEventHandler {
  canHandle(contractType: string, eventName: string): boolean;
  handle(event: SorobanRpc.Api.EventResponse): Promise<void>;
}

@Injectable()
export class ContractEventDispatcher {
  private readonly logger = new Logger(ContractEventDispatcher.name);
  private handlers: ContractEventHandler[] = [];

  register(handler: ContractEventHandler): void {
    this.handlers.push(handler);
    this.logger.log(`Registered event handler: ${handler.constructor.name}`);
  }

  async dispatch(event: SorobanRpc.Api.EventResponse): Promise<void> {
    const topic = (event.topic ?? []).map((t: any) => t?.value?.toString() ?? '');
    const [contractType, eventName] = topic;

    if (!contractType || !eventName) {
      this.logger.debug(`Skipping event with incomplete topic: [${topic}]`);
      return;
    }

    for (const handler of this.handlers) {
      if (handler.canHandle(contractType, eventName)) {
        try {
          await handler.handle(event);
          return; // First matching handler handles the event
        } catch (err) {
          this.logger.error(
            `Handler ${handler.constructor.name} failed for ${contractType}.${eventName}: ${(err as Error).message}`,
            (err as Error).stack
          );
        }
      }
    }

    this.logger.debug(
      `No handler found for contract event: ${contractType}.${eventName}`
    );
  }
}

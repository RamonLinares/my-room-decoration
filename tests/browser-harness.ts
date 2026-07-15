import { TouchIntentController } from '../src/core/TouchIntentController';
import { MyRoomPersistence } from '../src/persistence';

declare global {
  interface Window {
    __MY_ROOM_BROWSER_TEST_MODULES__?: {
      MyRoomPersistence: typeof MyRoomPersistence;
      TouchIntentController: typeof TouchIntentController;
    };
  }
}

window.__MY_ROOM_BROWSER_TEST_MODULES__ = {
  MyRoomPersistence,
  TouchIntentController,
};

document.documentElement.dataset.harnessReady = 'true';

import { startRush } from './game/rushBoot';
import { registerPwa } from './pwa';

registerPwa();
startRush('game');

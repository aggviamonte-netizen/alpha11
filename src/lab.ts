import { startLab } from './game/boot';
import { registerPwa } from './pwa';

registerPwa();
startLab('game');

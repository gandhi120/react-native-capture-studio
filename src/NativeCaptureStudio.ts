import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  openCaptureStudio(options: Object): Promise<Object>;
  // Image processing methods
  processImages(images: Object[]): Promise<string>;
  fetchProcessingResult(operationId: string): Promise<string>;
  generateThumbnail(item: Object): Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('CaptureStudio');

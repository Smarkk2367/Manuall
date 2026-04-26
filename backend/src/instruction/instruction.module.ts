import { Module, Global } from '@nestjs/common';
import { InstructionService } from './instruction.service';
import { InstructionController } from './instruction.controller';

@Global()
@Module({
  providers: [InstructionService],
  controllers: [InstructionController],
  exports: [InstructionService]
})
export class InstructionModule {}

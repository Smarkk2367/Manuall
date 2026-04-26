import { Test, TestingModule } from '@nestjs/testing';
import { InstructionController } from './instruction.controller';

describe('InstructionController', () => {
  let controller: InstructionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstructionController],
    }).compile();

    controller = module.get<InstructionController>(InstructionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

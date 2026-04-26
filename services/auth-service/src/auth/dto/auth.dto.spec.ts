import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './auth.dto';

describe('RegisterDto (class-validator)', () => {
  it('rechaza contraseña con menos de 8 caracteres', async () => {
    const dto = plainToInstance(RegisterDto, {
      username: 'user1',
      email: 'a@b.com',
      password: 'short',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('acepta un registro válido', async () => {
    const dto = plainToInstance(RegisterDto, {
      username: 'user1',
      email: 'a@b.com',
      password: '12345678',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rechaza email inválido', async () => {
    const dto = plainToInstance(RegisterDto, {
      username: 'user1',
      email: 'not-an-email',
      password: '12345678',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });
});

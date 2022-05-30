import { getTranslatable, translatable } from '..';

describe('Field Utils', () => {
  it('should get empty metadata when none exists', () => {
    const instance = new NoMetadata();
    expect(getTranslatable(instance)).toEqual([]);
  });

  it('should get valid metadata with instance and not type', () => {
    const instance = new WithMetadata();
    expect(getTranslatable(WithMetadata)).toEqual([]);

    expect(getTranslatable(instance)).not.toEqual([]);
  });

  it('should get metadata existing on current class', () => {
    const instance = new WithMetadata();
    const translatable = getTranslatable(instance);
    expect(translatable.sort()).toEqual(['description', 'name']);
  });

  it('should get metadata existing on inherited class', () => {
    const instance = new WithParentMetadata();
    const translatable = getTranslatable(instance);
    expect(translatable.sort()).toEqual(['comment', 'description', 'name']);
  });
});

class NoMetadata {
  id!: number;
  code!: string;
}

class WithMetadata extends NoMetadata {
  date!: Date;
  @translatable()
  name!: string;
  @translatable()
  description!: string;
}

class WithParentMetadata extends WithMetadata {
  secret!: string;
  @translatable()
  comment!: string;
}

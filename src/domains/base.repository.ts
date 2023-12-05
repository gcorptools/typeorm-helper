import { ValidatedEntity } from '@src/domains/base.validated.entity';
import { Page } from '@src/types';
import {
  DeepPartial,
  EntityManager,
  EntityTarget,
  FindManyOptions,
  QueryRunner,
  Repository
} from 'typeorm';

export class BaseRepository<T extends ValidatedEntity> extends Repository<T> {
  private _repository: Repository<T>;
  private _modelClass: new () => T;

  constructor(
    target: EntityTarget<T> & (new () => T),
    manager: EntityManager,
    queryRunner?: QueryRunner
  ) {
    super(target, manager, queryRunner);
    this._repository = manager.getRepository(target);
    this._modelClass = target;
  }

  create(): T;
  create(entityLikeArray: DeepPartial<T>[]): T[];
  create(entityLike: DeepPartial<T>): T;
  create(
    plainEntityLikeOrPlainEntityLikes?: DeepPartial<T> | DeepPartial<T>[]
  ): T | T[] {
    const instance = new this._modelClass();
    const newData = instance.setDefaultFields(
      plainEntityLikeOrPlainEntityLikes
    ) as DeepPartial<T> | DeepPartial<T>[];
    if (Array.isArray(newData)) {
      return super.create(newData);
    }
    return super.create(newData);
  }

  /**
   * Find records and add it in a page object
   * @param options the query options
   */
  async findPage(options?: FindManyOptions<T>): Promise<Page<T>> {
    const safeOptions = this._initOptions(options);
    return this._repository
      .findAndCount(safeOptions)
      .then(([records, totalElements]: [T[], number]) =>
        this._getPage(
          safeOptions.take!,
          safeOptions.skip!,
          records,
          totalElements
        )
      );
  }

  private _getPage(
    take: number,
    skip: number,
    data: T[],
    totalElements: number
  ): Page<T> {
    const count = (data || []).length;
    return {
      page: Math.floor(skip / take),
      size: take,
      count,
      data,
      totalElements,
      totalPages: count > 0 ? Math.ceil(totalElements / count) : 0
    };
  }

  private _initOptions(options?: FindManyOptions<T>): FindManyOptions<T> {
    const { take, skip } = options || {};
    const size = take || 20;
    const page = Math.floor((skip || 0) / size);
    return (options = {
      ...(options || {}),
      take: size,
      skip: page * size
    });
  }
}

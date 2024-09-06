type resolveFn<T> = (value: T | PromiseLike<T>) => void;
type rejectFn = (reason?: unknown) => void;
/**
 * 使用方式如下：
 * const v = new Defered()
 * const rs = await v.wait;
 *
 * 在另外的地方，如 v.resolve(value)
 * 如果出错，另外的地方 v.reject(err)
 */
export default class Defered<T> {
  private _promise: Promise<T>|null = null;

  private _resolve: resolveFn<T> |null = null;

  private _reject: rejectFn|null = null;

  constructor() {
    this._promise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  get promise() {
    if (!this._promise) {
      throw new Error('Defered not initialize correctly.');
    }
    return this._promise;
  }

  get resolve() {
    if (!this._resolve) {
      throw new Error('Defered not initialize correctly.');
    }
    return this._resolve;
  }

  get reject() {
    if (!this._reject) {
      throw new Error('Defered not initialize correctly.');
    }
    return this._reject;
  }
}

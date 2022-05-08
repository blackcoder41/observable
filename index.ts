const arr = [2, 4, 6, 8, 10];

const result = arr.reduce((prev, curr, i) => {
  console.log(`Previous value is ${prev}`);
  console.log(`Current value is ${curr}`);
  console.log(`Index is at ${i}`);
  return prev + curr;
});

console.log(`The result is ${result}`);


interface Observer<T> {
  next(value: T): void;
  error(err: any): void;
  complete(): void;
}

type Teardown = () => void;

class Subscriber<T> implements Observer<T> {
  closed = false;

  constructor(
    private destination: Observer<T>,
    private subscription: Subscription
  ) {
    subscription.add(() => {
      console.log('default teardown');
      this.closed = true;
    });
  }

  next(value: T): void {
    if (!this.closed) {
      this.destination.next(value);
    }
  }
  error(err: any): void {
    if (!this.closed) {
      this.closed = true;
      this.destination.error(err);
      this.subscription.unsubscribe();
    }
  }
  complete(): void {
    if (!this.closed) {
      this.closed = true;
      this.destination.complete();
      this.subscription.unsubscribe();
    }
  }
}

class Subscription {
  private teardowns: Teardown[] = [];

  add(teardown: Teardown) {
    this.teardowns.push(teardown);
  }

  unsubscribe() {
    for (const teardown of this.teardowns) {
      teardown();
    }
    this.teardowns = [];
  }
}

class Observable<T> {

  constructor(
    private init: (observer: Observer<T>) => Teardown,
    public name: string
  ) {

  }

  private randomInt() {
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  }

  subscribe(observer: Observer<T>): Subscription {
    console.log('subscribe ' + this.name);
    const subscription = new Subscription();
    const subscriber = new Subscriber(observer, subscription);
    subscription.add(this.init(subscriber));
    return subscription;
  }

  lett<R>(fn: (source: Observable<T>) => Observable<R>) {
    return new Observable<R>((observer) => {
      console.log('lett do work');
      const subscription = fn(this).subscribe(observer);
      return () => {
        subscription.unsubscribe();
      };
    }, "Observable returned by lett");
  }

  pipe<R>(...fns: Array<(source: Observable<any>) => Observable<any>>): Observable<R> {
    return pipe(...fns)(this);
  }
}

function map<T, R>(fn: (value: T) => R) {
  console.log('map return');
  return (source: Observable<T>) => {
    console.log('map function called');
    return new Observable<R>((observer) => {
      console.log('map do work');
      const subscription = source.subscribe({
        next(value: T) {
          console.log(value);
          observer.next(fn(value));
        },
        error(err) {
          observer.next(err);
        },
        complete() {
          observer.complete();
        },
      });
      return () => {
        console.log('map teardown');
        subscription.unsubscribe();
      };
    }, "Observable returned by map");
  };
}

const myObservable = new Observable((observer: Observer<number>) => {
  console.log('myObservable do work');
  let i = 0;
  const id = setInterval(() => {
    observer.next(i++);
    if (i > 3) {
      observer.complete();
      observer.next(i);
    }
  }, 1000);

  return () => {
    console.log('teardown');
    clearInterval(id);
  };
}, "Main Observable");

const teardown = myObservable
  .pipe(
    map((x) => x + 100),
    map((x) => x + 5)
  )
  .subscribe({
    next(value) {
      console.log(value);
      const div = document.createElement('div');
      div.textContent = `emmit ${value}`;
      document.body.append(div);
    },
    error(err) {
      console.log(err);
    },
    complete() {
      console.log('done');
    },
  });

// setTimeout(() => teardown.unsubscribe(), 10000);


function pipe(...fns: Array<(source: Observable<any>) => Observable<any>>) {
  return (source: Observable<any>) => fns.reduce((prev, fn) => fn(prev), source);
}
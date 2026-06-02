01-generics.ts — Ch 3 Repository or Ch 5 Pipeline
02-utility-types.ts — Ch 4 ApiResult narrowing
03-discriminated-unions.ts — Ch 4 SyncMachine
04-advanced-patterns.ts — Ch 3 FlattenObject

In enterprise apps, data access is abstracted into a "repository" class.
// Create a generic `Repository<T>` class with these methods:
//   - findById(id: string): T | undefined
//   - findAll(): T[]
//   - findWhere(predicate: (item: T) => boolean): T[]
//   - save(item: T): void   (upsert by id)
//   - delete(id: string): boolean
//
// Constraint: T must have an `id: string` field.
// Use: T extends { id: string }
//
// After implementing, instantiate:
//   const userRepo = new Repository<User>();
//   const productRepo = new Repository<Product>();

class Repository<T extends {id: string}>{
    private items:T[]=[];
    findById(id: string): T | undefined{
        return this.items.find((i)=>i.id===id);
    }
    save(item: T): void{
       //upsert by id means if found update else add
        const index = this.items.findIndex((i) => i.id === item.id);
        if (index >= 0) {
        this.items[index] = item; // Update existing
        } else {
        this.items.push(item); // Add new
        }
    }

    findAll(): T[]{
        return this.items;
    }
    findWhere(predicate: (item: T) => boolean): T[]{
        return this.items.filter(predicate);
    }
    delete(id: string): boolean{
         const index = this.items.findIndex((i) => i.id === item.id);
        if (index >= 0) {
        this.items.splice(index, 1);
        }
        return index>=0;
    }
    
}
const userRepo = new Repository<User>();
//   const productRepo = new Repository<Product>();

took me 10 mins.
What I forgot

I actually forgot how to start, 
like simple basic keeping a record of items. 
forgot how to remove from given index. confused though thought about splice but got confused what it returns.

===========================Ch 5 Pipeline============ 
// Build a Pipeline<TInput, TOutput> class that allows chaining transformations.
// This pattern is used in data processing and is directly relevant to your
// Yeyro health data pipeline work.
//
// const result = new Pipeline<HealthMetric[]>()
//   .pipe(validateMetrics)       // HealthMetric[] → HealthMetric[]
//   .pipe(aggregateByType)       // HealthMetric[] → AggregatedData
//   .pipe(generateInsights)      // AggregatedData → ProcessedInsight[]
//   .execute(rawHealthData);
//
// The challenge: each .pipe() step can CHANGE the output type.
// You'll need: pipe<TNext>(fn: (input: TCurrent) => TNext): Pipeline<TInput, TNext>
//
// Hint: You need to track the "current" output type as a third type parameter
// internally, and return a new Pipeline instance with the updated output type.
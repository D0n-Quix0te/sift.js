![Alt travis status](https://secure.travis-ci.org/crcn/sift.js.png)


## Features:

- Supported operators: $in, $nin, $exists, $gte, $gt, $lte, $lt, $eq, $neq, $mod, $all, $and, $or, $size, $type
- Regexp searches
- Function filtering
- Deep object searching

## Simple Examples

```javascript

var sift = require('sift');

//interesecting arrays
var sifted = sift({ $in: ['hello','world'] }, ['hello','sifted','array!']); //['hello']

//regexp filter
var sifted = sift(/^j/, ['craig','john','jake']); //['john','jake']


//A *sifter* is returned if the second parameter is omited
var siftPeople = sift({

	//you can also filter against functions
	name: function(value) {
		return name.length == 5;
	}
});

//filtered: [{ name: 'craig' }]
siftPeople([{
	name: 'craig',
},
{
	name: 'john'
},
{
	name: 'jake'
}]);


//you can also test *single values* against your custom sifter
siftPeople.test({ name: 'sarah' }); //true
siftPeople.test({ name: 'tim' }); //false

```

## API

### .sift(filter[, array])

- `filter` - the filter to use against the target array
- `array` - sifts against target array. Without this, a function is returned

With an array:

```javascript
sift({$exists:true}, ['craig',null]); //['craig']
```

Without an array, a sifter is returned:

```javascript
var siftExists = sift({$exists:true});

siftExists(['craig',null]); //['craig']
```

With your sifter, you can also **test** values:

```javascript
siftExists.test(null); //false
siftExists.test('craig'); //true
```


## Supported Operators:

See MonboDB's [advanced queries](http://www.mongodb.org/display/DOCS/Advanced+Queries) for more info.

### $in

array value must be *$in* the given query:

Intersecting two arrays:
 
```javascript
//filtered: ['Brazil']
sift({ $in: ['Costa Rica','Brazil'] }, ['Brazil','Haiti','Peru','Chile']); 
``` 

Here's another example. This acts more like the $or operator:

```javascript
sift({ location: { $in: ['Costa Rica','Brazil'] } }, { name: 'Craig', location: 'Brazil' });
```

### $nin

Oppositve of $in:

```javascript
//filtered: ['Haiti','Peru','Chile']
sift({ $in: ['Costa Rica','Brazil'] }, ['Brazil','Haiti','Peru','Chile']); 
``` 

### $exists

Checks if whether a value exists:

```javascript
//filtered: ['Craig','Tim']
sift({ $exists: true }, ['Craig',null,'Tim']); 
``` 

You can also filter out values that don't exist

```javascript
//filtered: [{ name: 'Craig', city: 'Minneapolis' }]
sift({ city: { $exists: false } }, [ { name: 'Craig', city: 'Minneapolis' }, { name: 'Tim' }]); 
```

### $gte

Checks if a number is >= value:

```javascript
//filtered: [2, 3]
sift({ $gte: 2 }, [0, 1, 2, 3]); 
```

### $gt

Checks if a number is > value:

```javascript
//filtered: [3]
sift({ $gt: 2 }, [0, 1, 2, 3]); 
```

### $lte

Checks if a number is <= value.

### $lt

Checks if number is < value.

### $eq

Checks if query != value. Note that **$eq can be omitted**. For **$eq**, and **$neq**

```javascript
//filtered: [{ state: 'MN' }]
sift({ state: {$eq: 'MN' }}, [{ state: 'MN' }, { state: 'CA' }, { state: 'WI' }); 
```



### $ne

Checks if query == value.

```javascript
//filtered: [{ state: 'CA' }, { state: 'WI'}] 
sift({ state: {$ne: 'MN' }}, [{ state: 'MN' }, { state: 'CA' }, { state: 'WI' }); 
```

### $mod

Modulus:

```javascript
//filtered: [300, 600]
sift({ $mod: [3, 0] }, [100, 200, 300, 400, 500, 600]); 
```

### $all

values must match **everything** in array:

```javascript
//filtered: [ { tags: ['books','programming','travel' ]} ]
sift({ tags: {$all: ['books','programming'] }}, [
{ tags: ['books','programming','travel' ] }, 
{ tags: ['travel','cooking'] } ]); 
```

### $and

ability to use an array of expressions. All expressions must test true.

```javascript
//filtered: [ { name: 'Craig', state: 'MN' }]

sift({ $and: [ { name: 'Craig' }, { state: 'MN' } ] }, [ 
{ name: 'Craig', state: 'MN' }, 
{ name: 'Tim', state: 'MN' }, 
{ name: 'Joe', state: 'CA' } ]); 
```

### $or

OR array of expressions.

```javascript
//filtered: [ { name: 'Craig', state: 'MN' }, { name: 'Tim', state: 'MN' }]
sift({ $or: [ { name: 'Craig' }, { state: 'MN' } ] }, [ 
{ name: 'Craig', state: 'MN' }, 
{ name: 'Tim', state: 'MN' }, 
{ name: 'Joe', state: 'CA' } ]); 
```

### $size

Matches an array - must match given size:

```javascript
//filtered: ['food','cooking']
sift({ tags: { $size: 2 } }, [ { tags: ['food','cooking'] }, { tags: ['traveling'] }]); 
```

### $type

Matches a values based on the type

```javascript
sift({ $type: Date }, [new Date(), 4342, 'hello world']); //returns single date
sift({ $type: String }, [new Date(), 4342, 'hello world']); //returns ['hello world']
```


## Deep Searching Example:


```javascript
var people = [{
	name: 'craig',
	address: {
		city: 'Minneapolis'
	}
},
{
	name: 'tim',
	address: {
		city: 'St. Paul'
	}
}];

var sifted = sift({ address: { state: 'Minneapolis' }}, people); // count = 1
```


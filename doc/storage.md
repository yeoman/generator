

<!-- Start lib/util/storage.js -->

## Storage

Storage instances handle a json file where Generator authors can store data.

### Params: 

* **String** *name* The name of the new storage (this is a namespace)

* **String** *configPath* The filepath used as a storage. `.yo-rc.json` is used

## loadConfig()

Get the previous configs or setup a new one.
note: it won't actually create any file before save is called.

### Return:

* **Object** Key-value object store

## save()

Schedule a save to happen sometime on a future tick.
Note: This method is actually defined at runtime in the constructor function.

### Return:

* **null** 

## forceSave()

Force save (synchronously write the store to disk).

### Return:

* **null** 

## get(key)

Get a stored value

### Params: 

* **String** *key* The key under which the value is stored.

### Return:

* ***** The stored value. Any JSON valid type could be returned

## getAll()

Get all the stored values

### Return:

* **Object** key-value object

## set(key, val)

Assign a key to a value and schedule a save.

### Params: 

* **String** *key* 

* ***** *val* Any valid JSON type value (String, Number, Array, Object)

## delete(key)

Delete a key from the store and schedule a save.

### Params: 

* **String** *key* 

### Return:

* **null** 

## defaults(defaults)

Setup the store with defaults value and schedule a save.
If keys already exist, the initial value is kept.

### Params: 

* **Object** *defaults* Key-value object to store.

### Return:

* **null** 

<!-- End lib/util/storage.js -->


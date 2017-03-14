
let BTreeEnums = {
    gid = 0,
    //Behaviour Types
    SEQUENTIAL = Symbol('sequential'),
    PARALLEL = Symbol('parallel'),
    CHOICE = Symbol('choice'),
    //Node States:
    ACTIVE = Symbol('active'),
    FINISHED = Symbol('finished'),
    INACTIVE = Symbol('inactive'),
    WAIT = Symbol('wait'),
    //RETURN statuses
    SUCCESS = Symbol('success'),
    FAIL = Symbol('failure'),
    //PERSISTENCE types
    SUCCESSPERSIST = Symbol('persist_until_success'),
    FAILPERSIST = Symbol('persist_until_failure'),
    PERSIST = Symbol('persist')
};

export { BTreeEnums };

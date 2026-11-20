/** Same shape as `T`, but every leaf is a plain `string` (used to type translations). */
export type Messages<T> = {
  [K in keyof T]: T[K] extends string ? string : Messages<T[K]>
}

/** Union of all dotted leaf paths of a message object, e.g. `'home.title'`. */
export type MessageKeys<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : MessageKeys<T[K], `${Prefix}${K}.`>
}[keyof T & string]

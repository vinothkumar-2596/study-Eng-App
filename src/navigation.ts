import type { RecentBook } from './types/learning'

export type RootStackParamList = {
  Home: undefined
  Reader: { book: RecentBook }
  Library: undefined
  Settings: undefined
}

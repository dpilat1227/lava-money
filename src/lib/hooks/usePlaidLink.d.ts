// Metro already resolves the bare `usePlaidLink` import to the correct
// platform file (usePlaidLink.native.ts on iOS/Android, usePlaidLink.web.ts
// on web) automatically -- that's Metro's own built-in platform-extension
// convention, unrelated to TypeScript and requiring no config.
//
// This file exists purely so `tsc`/editor intellisense can resolve the
// same bare import too. The alternative (a project-wide `moduleSuffixes`
// tsconfig option) was tried and reverted -- it also changes how every
// *other* package resolves its own internal platform-split files, which
// broke unrelated `react-native-svg` type resolution. A single ambient
// re-export here is inert at bundle time (bundlers don't process `.d.ts`
// files as modules at all) and touches nothing outside this one import
// path.
export * from './usePlaidLink.native';

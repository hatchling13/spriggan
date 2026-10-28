import { Match, SchemaIssue } from 'effect';

export type LocatedSchemaIssue = {
  readonly path: readonly PropertyKey[];
  readonly issue: SchemaIssue.Issue;
};

export const collectSchemaIssues = (
  issue: SchemaIssue.Issue,
  path: readonly PropertyKey[] = [],
): LocatedSchemaIssue[] =>
  Match.value(issue).pipe(
    Match.tag('Composite', ({ issues }) =>
      issues.flatMap((innerIssue) => collectSchemaIssues(innerIssue, path)),
    ),
    Match.tag('Encoding', ({ issue: innerIssue }) =>
      collectSchemaIssues(innerIssue, path),
    ),
    Match.tag('Pointer', ({ issue: innerIssue, path: innerPath }) =>
      collectSchemaIssues(innerIssue, [...path, ...innerPath]),
    ),
    Match.tag('AnyOf', (outerIssue) =>
      outerIssue.issues.length === 0
        ? [{ path, issue: outerIssue }]
        : outerIssue.issues.flatMap((innerIssue) =>
            collectSchemaIssues(innerIssue, path),
          ),
    ),
    Match.orElse((innerIssue) => [
      {
        path,
        issue: innerIssue,
      },
    ]),
  );

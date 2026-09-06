export enum MisconceptionSignalType {
  RepeatedMistake = 'Repeated Mistake',
  StoryProblem = 'Story Problem',
  VisualRepresentation = 'Visual Representation',
  HighLanguageComplexity = 'High Language Complexity',
  HintsOverused = 'Hints Overused',
}

export enum MisconceptionSignalStatus {
  Potential = 'Potential',
  Suggested = 'Suggested',
  Confirmed = 'Confirmed',
  Dismissed = 'Dismissed',
}

import {PollData, Results} from '../types/pollTypes';

export const testPolls: PollData[] = [
  {
    pollId: 1,
    user: 'john_doe',
    title: 'Should we implement dark mode?',
    description: 'Vote on whether we should add a dark theme to the app',
    type: 'simple',
    allowComments: true,
    options: [
      {optionTypeId: 1, optionText: 'Yes'},
      {optionTypeId: 2, optionText: 'No'},
    ],
  },
  {
    pollId: 2,
    user: 'jane_smith',
    title: 'Best programming language?',
    description:
      'Choose your favorite programming language for mobile development',
    type: 'simple',
    allowComments: true,
    options: [
      {optionTypeId: 1, optionText: 'JavaScript'},
      {optionTypeId: 2, optionText: 'TypeScript'},
      {optionTypeId: 3, optionText: 'Dart'},
      {optionTypeId: 4, optionText: 'Swift'},
      {optionTypeId: 5, optionText: 'Kotlin'},
    ],
  },
  {
    pollId: 3,
    user: 'mike_wilson',
    title: 'Thumbs up or down?',
    description: 'Simple up/down vote on the new feature',
    type: 'simple',
    allowComments: false,
    options: [
      {optionTypeId: 1, optionText: 'Up'},
      {optionTypeId: 2, optionText: 'Down'},
    ],
  },
  {
    pollId: 4,
    user: 'sarah_jones',
    title: 'Rate our app experience',
    description: 'How would you rate your overall experience with our app?',
    type: 'slider',
    allowComments: true,
    options: [
      {optionTypeId: 1, optionText: 'Terrible'},
      {optionTypeId: 2, optionText: 'Poor'},
      {optionTypeId: 3, optionText: 'Average'},
      {optionTypeId: 4, optionText: 'Good'},
      {optionTypeId: 5, optionText: 'Excellent'},
    ],
  },
  {
    pollId: 5,
    user: 'alex_brown',
    title: 'Coffee or Tea?',
    type: 'simple',
    allowComments: false,
    options: [
      {optionTypeId: 1, optionText: 'Coffee'},
      {optionTypeId: 2, optionText: 'Tea'},
    ],
  },
  {
    pollId: 6,
    user: 'emily_davis',
    title: 'Favorite social media platform',
    description: 'Which platform do you use most often?',
    type: 'simple',
    allowComments: true,
    options: [
      {optionTypeId: 1, optionText: 'Twitter'},
      {optionTypeId: 2, optionText: 'Instagram'},
      {optionTypeId: 3, optionText: 'TikTok'},
      {optionTypeId: 4, optionText: 'LinkedIn'},
      {optionTypeId: 5, optionText: 'Facebook'},
    ],
  },
];

export const edgeCasePolls: PollData[] = [
  {
    pollId: 101,
    user: 'qa_user',
    title:
      'Very long title: Would you use an app experience that includes detailed voting analytics, comment moderation, and customizable preference settings?',
    description:
      'This poll is intentionally verbose to test text wrapping and layout behavior on smaller screens.',
    type: 'simple',
    allowComments: true,
    options: [
      {optionTypeId: 1, optionText: 'Absolutely, I would use it daily'},
      {optionTypeId: 2, optionText: 'Maybe, depending on performance'},
    ],
  },
  {
    pollId: 102,
    user: 'qa_user',
    title: 'Minimal poll with no description',
    type: 'simple',
    allowComments: false,
    options: [
      {optionTypeId: 1, optionText: 'Option A'},
      {optionTypeId: 2, optionText: 'Option B'},
    ],
  },
  {
    pollId: 103,
    user: 'qa_user',
    title: 'Slider poll with many options',
    description: 'Used to test rendering and scrolling of longer option lists.',
    type: 'slider',
    allowComments: true,
    options: [
      {optionTypeId: 1, optionText: 'Strongly dislike'},
      {optionTypeId: 2, optionText: 'Dislike'},
      {optionTypeId: 3, optionText: 'Neutral'},
      {optionTypeId: 4, optionText: 'Like'},
      {optionTypeId: 5, optionText: 'Strongly like'},
      {optionTypeId: 6, optionText: 'Love it'},
    ],
  },
  {
    pollId: 104,
    user: 'qa_user',
    title: 'Unsupported poll type coverage',
    description: 'This validates behavior for poll types not rendered yet.',
    type: 'multi',
    allowComments: true,
    options: [
      {optionTypeId: 1, optionText: 'Alpha'},
      {optionTypeId: 2, optionText: 'Beta'},
      {optionTypeId: 3, optionText: 'Gamma'},
    ],
  },
];

export const mockPolls: PollData[] = [...testPolls, ...edgeCasePolls];

export const testResults: Results[] = [
  {pollId: 1, optionId: 1, votes: 45},
  {pollId: 1, optionId: 2, votes: 23},
  {pollId: 2, optionId: 1, votes: 12},
  {pollId: 2, optionId: 2, votes: 34},
  {pollId: 2, optionId: 3, votes: 8},
  {pollId: 2, optionId: 4, votes: 15},
  {pollId: 2, optionId: 5, votes: 19},
  {pollId: 3, optionId: 1, votes: 67},
  {pollId: 3, optionId: 2, votes: 31},
  {pollId: 4, optionId: 1, votes: 5},
  {pollId: 4, optionId: 2, votes: 12},
  {pollId: 4, optionId: 3, votes: 28},
  {pollId: 4, optionId: 4, votes: 41},
  {pollId: 4, optionId: 5, votes: 22},
  {pollId: 5, optionId: 1, votes: 89},
  {pollId: 5, optionId: 2, votes: 56},
  {pollId: 6, optionId: 1, votes: 23},
  {pollId: 6, optionId: 2, votes: 45},
  {pollId: 6, optionId: 3, votes: 67},
  {pollId: 6, optionId: 4, votes: 12},
  {pollId: 6, optionId: 5, votes: 34},
];

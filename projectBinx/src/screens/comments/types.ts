import {PollComment} from '../../types/pollTypes';

export interface CommentData {
  id: string;
  commentId?: number;
  parentCommentId?: number | null;
  replyToUsername?: string;
  replyToAlias?: string;
  username: string;
  authorAlias?: string;
  authorAvatarInitials?: string;
  authorAvatarColor?: string;
  content: string;
  likes: number;
  dislikes: number;
  createdAt?: string;
  isDraft?: boolean;
  likedByCurrentUser?: boolean;
  dislikedByCurrentUser?: boolean;
}

export type CommentSortOption =
  | 'most-liked'
  | 'most-disliked'
  | 'most-replies'
  | 'least-replies'
  | 'newest'
  | 'oldest';

export const COMMENT_SORT_OPTIONS: Array<{
  value: CommentSortOption;
  label: string;
}> = [
  {value: 'most-liked', label: 'Most Liked'},
  {value: 'most-disliked', label: 'Most Disliked'},
  {value: 'most-replies', label: 'Most Replies'},
  {value: 'least-replies', label: 'Least Replies'},
  {value: 'newest', label: 'Newest'},
  {value: 'oldest', label: 'Oldest'},
];

export const mapPollCommentToUi = (comment: PollComment): CommentData => ({
  id: String(comment.commentId),
  commentId: comment.commentId,
  parentCommentId: comment.parentCommentId,
  username: comment.authorName,
  authorAlias: comment.authorAlias,
  authorAvatarInitials: comment.authorAvatarInitials,
  authorAvatarColor: comment.authorAvatarColor,
  content: comment.content,
  likes: comment.likes,
  dislikes: comment.dislikes,
  createdAt: comment.createdAt,
  likedByCurrentUser: comment.viewerReaction === 'like',
  dislikedByCurrentUser: comment.viewerReaction === 'dislike',
});

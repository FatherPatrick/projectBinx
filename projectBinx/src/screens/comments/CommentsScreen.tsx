import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {RouteProp} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../../types/navigation';
import ConfirmDialog from '../../components/ConfirmDialog';
import {MoreOptionsButton} from '../../components/MoreOptionsButton';
import SessionService from '../../services/sessionService';
import AnonymousNameService from '../../services/anonymousNameService';
import styles from '../../styles/commentsStyles';
import theme from '../../styles/theme';
import CommentsHeader from './components/CommentsHeader';
import CommentsFilterMenu from './components/CommentsFilterMenu';
import useCommentsFilterMenu from './hooks/useCommentsFilterMenu';
import useCommentsFeed from './hooks/useCommentsFeed';
import {CommentData, CommentSortOption, COMMENT_SORT_OPTIONS} from './types';

type CommentsRouteProp = RouteProp<RootStackParamList, 'Comments'>;
type CommentsNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Comments'
>;

interface Props {
  route: CommentsRouteProp;
  navigation: CommentsNavigationProp;
}

const CommentsScreen: React.FC<Props> = ({route, navigation}) => {
  const {poll} = route.params;
  const currentUsername =
    SessionService.getCurrentUser()?.username ?? 'current_user';
  const currentAnonymousAlias =
    SessionService.getCurrentUser()?.anonymousAlias ??
    AnonymousNameService.generateRandomAlias();
  const currentUserAvatar = AnonymousNameService.sanitizeAvatar(
    {
      initials: SessionService.getCurrentUser()?.profileAvatarInitials,
      backgroundColor: SessionService.getCurrentUser()?.profileAvatarColor,
    },
    SessionService.getCurrentUser()?.username ?? currentUsername,
    SessionService.getCurrentUser()?.displayName,
  );
  const isAmaPoll = poll.type === 'ama';
  const pollAuthorUsername = poll.user.toLowerCase();
  const isCurrentUserPollAuthor =
    currentUsername.toLowerCase() === pollAuthorUsername;

  const {
    comments,
    totalCommentCount,
    isRefreshing,
    isLoadingMore,
    isInitialLoading,
    initialLoadError,
    expandedThreads,
    isDiscardReplyDraftDialogVisible,
    commentSortBy,
    sortedTopLevelComments,
    repliesByParentId,
    hasUserScrolledRef,
    setCommentSortBy,
    setIsInitialLoading,
    setHasMore,
    fetchCommentsPage,
    getDisplayAlias,
    getDisplayAvatar,
    sortCommentsByCurrentFilter,
    getTotalDescendantCount,
    canReplyToComment,
    toggleThread,
    handleLoadMore,
    handleRefresh,
    handleAddComment,
    handleAddReply,
    handleConfirmDiscardReplyDraft,
    handleCancelDiscardReplyDraft,
    handleDraftChange,
    handleSaveDraft,
    handleCancelDraft,
    handleDeleteComment,
    handleHideComment,
    handleLikeComment,
    handleDislikeComment,
  } = useCommentsFeed({
    poll,
    currentUsername,
    currentAnonymousAlias,
    currentUserAvatar,
    isAmaPoll,
    pollAuthorUsername,
    isCurrentUserPollAuthor,
  });

  const {
    filterButtonRef,
    isFilterMenuVisible,
    setIsFilterMenuVisible,
    filterMenuPosition,
    handleOpenFilterMenu,
    filterMenuWidth,
  } = useCommentsFilterMenu();

  const renderCommentCard = (item: CommentData, isReply = false) => {
    const isCurrentUserComment =
      item.username.toLowerCase() === currentUsername.toLowerCase();
    const parentCommentUsername =
      item.parentCommentId === null || item.parentCommentId === undefined
        ? undefined
        : comments.find(
            comment =>
              !comment.isDraft && comment.commentId === item.parentCommentId,
          );
    const canReply = canReplyToComment(item);
    const isReplyLocked = isAmaPoll && !isCurrentUserPollAuthor && !canReply;
    const isLikedByCurrentUser = Boolean(item.likedByCurrentUser);
    const isDislikedByCurrentUser = Boolean(item.dislikedByCurrentUser);
    const avatar = getDisplayAvatar(item);

    if (item.isDraft) {
      const isSaveDisabled = item.content.trim().length === 0;

      return (
        <View style={[styles.commentCard, isReply ? styles.replyCard : null]}>
          <View style={styles.commentHeaderRow}>
            <View
              style={[
                styles.avatarPlaceholder,
                {backgroundColor: avatar.backgroundColor},
              ]}>
              <Text style={styles.avatarInitialsText}>
                {AnonymousNameService.getEmojiForInitials(avatar.initials)}
              </Text>
            </View>
            <View style={styles.commentContentWrap}>
              <Text style={styles.username}>{getDisplayAlias(item)}</Text>
              {item.replyToAlias ? (
                <Text style={styles.replyingToText}>
                  Replying to {item.replyToAlias}
                </Text>
              ) : null}
              <TextInput
                style={styles.commentInput}
                value={item.content}
                onChangeText={value => handleDraftChange(item.id, value)}
                placeholder={
                  item.parentCommentId !== null &&
                  item.parentCommentId !== undefined
                    ? 'Write a reply...'
                    : 'Write a comment...'
                }
                multiline={true}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={styles.draftActionsRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelDraft(item.id)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveButton,
                isSaveDisabled ? styles.saveButtonDisabled : null,
              ]}
              disabled={isSaveDisabled}
              onPress={() => handleSaveDraft(item.id)}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.commentCard, isReply ? styles.replyCard : null]}>
        <MoreOptionsButton
          itemType="comment"
          containerStyle={styles.moreButton}
          onHide={() => handleHideComment(item.id)}
          onDelete={
            isCurrentUserComment
              ? () => handleDeleteComment(item.id)
              : undefined
          }
        />

        <View style={styles.commentHeaderRow}>
          <View
            style={[
              styles.avatarPlaceholder,
              {backgroundColor: avatar.backgroundColor},
            ]}>
            <Text style={styles.avatarInitialsText}>
              {AnonymousNameService.getEmojiForInitials(avatar.initials)}
            </Text>
          </View>
          <View style={styles.commentContentWrap}>
            <Text style={styles.username}>{getDisplayAlias(item)}</Text>
            {parentCommentUsername ? (
              <Text style={styles.replyingToText}>
                Replying to {getDisplayAlias(parentCommentUsername)}
              </Text>
            ) : null}
            <Text style={styles.commentText}>{item.content}</Text>
          </View>
        </View>

        <View style={styles.commentActionsRow}>
          <TouchableOpacity
            style={[
              styles.commentActionButton,
              isLikedByCurrentUser ? styles.commentActionButtonActive : null,
            ]}
            onPress={() => handleLikeComment(item.id)}>
            <Text style={styles.commentActionText}>👍 {item.likes}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.commentActionButton,
              isDislikedByCurrentUser ? styles.commentActionButtonActive : null,
            ]}
            onPress={() => handleDislikeComment(item.id)}>
            <Text style={styles.commentActionText}>👎 {item.dislikes}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.commentActionButton,
              !canReply ? styles.commentActionButtonDisabled : null,
            ]}
            disabled={!canReply}
            onPress={() => handleAddReply(item)}>
            <Text style={styles.commentActionText}>
              {isReplyLocked ? 'Reply Locked' : 'Reply'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCommentThread = (
    item: CommentData,
    depth = 0,
  ): React.ReactElement => {
    const commentId = item.commentId;
    const replies =
      commentId !== undefined
        ? sortCommentsByCurrentFilter(repliesByParentId[commentId] ?? [])
        : [];
    const hasReplies = replies.length > 0;
    const totalDescendantCount =
      commentId !== undefined ? getTotalDescendantCount(commentId) : 0;
    const isExpanded =
      commentId !== undefined ? Boolean(expandedThreads[commentId]) : false;

    return (
      <View key={item.id}>
        {renderCommentCard(item, depth > 0)}

        {hasReplies && commentId !== undefined ? (
          <TouchableOpacity
            style={[
              styles.threadToggleButton,
              depth > 0 ? styles.nestedThreadToggle : null,
            ]}
            onPress={() => toggleThread(commentId)}>
            <Text style={styles.threadToggleText}>
              {isExpanded
                ? 'Hide replies'
                : `View replies (${totalDescendantCount})`}
            </Text>
          </TouchableOpacity>
        ) : null}

        {hasReplies && isExpanded ? (
          <View style={styles.repliesContainer}>
            {replies.map(reply => renderCommentThread(reply, depth + 1))}
          </View>
        ) : null}
      </View>
    );
  };

  const renderComment: ListRenderItem<CommentData> = ({item}) =>
    renderCommentThread(item, 0);

  return (
    <>
      <FlatList
        data={sortedTopLevelComments}
        keyExtractor={item => item.id}
        renderItem={renderComment}
        contentContainerStyle={styles.screen}
        ListHeaderComponent={
          <CommentsHeader
            poll={poll}
            totalCommentCount={totalCommentCount}
            filterButtonRef={filterButtonRef}
            onOpenFilterMenu={handleOpenFilterMenu}
            onAddCommentPress={handleAddComment}
            onPollRemoved={() => navigation.goBack()}
          />
        }
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        overScrollMode="always"
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => {
          hasUserScrolledRef.current = true;
        }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          !isInitialLoading ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>
                {initialLoadError ?? 'No comments yet.'}
              </Text>
              {initialLoadError ? (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => {
                    setIsInitialLoading(true);
                    setHasMore(true);
                    fetchCommentsPage({pageToLoad: 1, append: false});
                  }}>
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null
        }
        ListFooterComponent={
          isLoadingMore ||
          (isInitialLoading && sortedTopLevelComments.length === 0) ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null
        }
      />

      <ConfirmDialog
        visible={isDiscardReplyDraftDialogVisible}
        title="Discard current reply?"
        message="You already have a reply draft. Discard it and start a new reply here?"
        confirmLabel="Discard draft"
        onConfirm={handleConfirmDiscardReplyDraft}
        onCancel={handleCancelDiscardReplyDraft}
      />

      <CommentsFilterMenu
        visible={isFilterMenuVisible}
        position={filterMenuPosition}
        menuWidth={filterMenuWidth}
        selectedSort={commentSortBy}
        options={COMMENT_SORT_OPTIONS}
        onClose={() => setIsFilterMenuVisible(false)}
        onSelect={(value: CommentSortOption) => {
          setCommentSortBy(value);
          setIsFilterMenuVisible(false);
        }}
      />
    </>
  );
};

export default CommentsScreen;

import React from 'react';
import {StyleSheet, Text, TouchableOpacity} from 'react-native';
import pollStyles from '../styles/pollStyles';
import theme from '../styles/theme';

interface SubmitVoteButtonProps {
  isSubmitting: boolean;
  onPress: () => void;
}

const SubmitVoteButton: React.FC<SubmitVoteButtonProps> = ({
  isSubmitting,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.submitButton, isSubmitting ? pollStyles.optionButtonDisabled : null]}
      disabled={isSubmitting}
      onPress={onPress}>
      <Text style={styles.submitButtonText}>
        {isSubmitting ? 'Submitting...' : 'Submit Vote'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  submitButton: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  submitButtonText: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
});

export default SubmitVoteButton;
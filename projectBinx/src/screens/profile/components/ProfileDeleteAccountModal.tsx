import React from 'react';
import {
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import profileStyles from '../../../styles/profileScreenStyles';

interface ProfileDeleteAccountModalProps {
  visible: boolean;
  deletePhrase: string;
  deletePhraseError: string | null;
  isDeletingAccount: boolean;
  onClose: () => void;
  onDeletePhraseChange: (value: string) => void;
  onDeleteAccount: () => void;
}

const ProfileDeleteAccountModal: React.FC<ProfileDeleteAccountModalProps> = ({
  visible,
  deletePhrase,
  deletePhraseError,
  isDeletingAccount,
  onClose,
  onDeletePhraseChange,
  onDeleteAccount,
}) => {
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableOpacity
        style={profileStyles.deleteModalBackdrop}
        activeOpacity={1}
        onPress={onClose}>
        <TouchableWithoutFeedback onPress={() => {}}>
          <View style={profileStyles.deleteModalCard}>
            <Text style={profileStyles.deleteModalTitle}>
              Final confirmation
            </Text>
            <Text style={profileStyles.deleteModalMessage}>
              Type DeleteMyAccount to permanently delete your account.
            </Text>

            <TextInput
              style={profileStyles.deleteInput}
              value={deletePhrase}
              onChangeText={onDeletePhraseChange}
              editable={!isDeletingAccount}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="DeleteMyAccount"
            />

            {deletePhraseError ? (
              <Text style={profileStyles.deleteErrorText}>
                {deletePhraseError}
              </Text>
            ) : null}

            <View style={profileStyles.deleteModalActionsRow}>
              <TouchableOpacity
                style={profileStyles.deleteCancelButton}
                disabled={isDeletingAccount}
                onPress={onClose}>
                <Text style={profileStyles.deleteCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  profileStyles.deleteConfirmButton,
                  isDeletingAccount ? profileStyles.logoutButtonDisabled : null,
                ]}
                disabled={isDeletingAccount}
                onPress={onDeleteAccount}>
                <Text style={profileStyles.deleteConfirmButtonText}>
                  {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  );
};

export default ProfileDeleteAccountModal;

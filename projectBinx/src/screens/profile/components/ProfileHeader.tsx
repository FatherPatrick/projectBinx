import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import AnonymousNameService from '../../../services/anonymousNameService';
import profileStyles from '../../../styles/profileScreenStyles';

interface ProfileHeaderProps {
  profileAvatar: {
    initials: string;
    backgroundColor: string;
  };
  profileName: string;
  profileBio: string;
  isLoggingOut: boolean;
  isDeletingAccount: boolean;
  onRegenerateAlias: () => void;
  onRegenerateProfilePicture: () => void;
  onOpenLogoutPrompt: () => void;
  onOpenDeletePrompt: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profileAvatar,
  profileName,
  profileBio,
  isLoggingOut,
  isDeletingAccount,
  onRegenerateAlias,
  onRegenerateProfilePicture,
  onOpenLogoutPrompt,
  onOpenDeletePrompt,
}) => {
  return (
    <View style={profileStyles.profileHeader}>
      <View
        style={[
          profileStyles.profileImagePlaceholder,
          {backgroundColor: profileAvatar.backgroundColor},
        ]}>
        <Text style={profileStyles.profileImageText}>
          {AnonymousNameService.getEmojiForInitials(profileAvatar.initials)}
        </Text>
      </View>

      <View style={profileStyles.profileDetails}>
        <Text style={profileStyles.name}>{profileName}</Text>
        <View style={profileStyles.regenerateButtonsRow}>
          <TouchableOpacity
            style={profileStyles.regenerateButton}
            onPress={onRegenerateAlias}>
            <Text style={profileStyles.regenerateButtonText}>
              Regenerate Name
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={profileStyles.regenerateButton}
            onPress={onRegenerateProfilePicture}>
            <Text style={profileStyles.regenerateButtonText}>
              Regenerate Picture
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={profileStyles.bio}>{profileBio}</Text>

        <View style={profileStyles.accountActionsRow}>
          <TouchableOpacity
            style={[
              profileStyles.logoutButton,
              isLoggingOut ? profileStyles.logoutButtonDisabled : null,
            ]}
            disabled={isLoggingOut}
            onPress={onOpenLogoutPrompt}>
            <Text style={profileStyles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              profileStyles.deleteAccountButton,
              isDeletingAccount ? profileStyles.logoutButtonDisabled : null,
            ]}
            disabled={isDeletingAccount}
            onPress={onOpenDeletePrompt}>
            <Text style={profileStyles.deleteAccountButtonText}>
              Delete Account
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default ProfileHeader;

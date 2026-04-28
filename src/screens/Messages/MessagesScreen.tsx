import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import TopBar from '../../components/TopBar';
import { DEFAULT_AVATAR_URL } from '../../services/firebase/constants';
import { subscribeMyConversations, type ConversationListItem } from '../../services/firebase';
import { safeImageUri } from '../../utils/imageSource';

function formatConversationTime(value: ConversationListItem['lastMessageAt']): string {
  const ms = typeof (value as any)?.toMillis === 'function'
    ? (value as any).toMillis()
    : typeof (value as any)?.seconds === 'number'
      ? (value as any).seconds * 1000
      : 0;

  if (!ms) {
    return 'Vừa xong';
  }

  const diffSec = Math.max(1, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}p`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h`;
  return `${Math.floor(diffHour / 24)}d`;
}

export default function MessagesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  React.useEffect(() => {
    const unsubscribe = subscribeMyConversations(
      (nextItems) => {
        setItems(nextItems);
        setError('');
        setLoading(false);
      },
      (e) => {
        setError(e instanceof Error ? e.message : 'Không thể tải tin nhắn');
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const filteredConversations = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) {
      return items;
    }

    return items.filter((item) =>
      item.partnerName.toLowerCase().includes(normalized) || item.lastMessage.toLowerCase().includes(normalized),
    );
  }, [items, keyword]);

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Tin nhắn" leftIcon="arrow-back" onPressLeft={() => navigation.goBack()} showRight={false} />

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#A39C99" />
        <TextInput
          value={keyword}
          onChangeText={setKeyword}
          placeholder="Tìm kiếm tin nhắn"
          placeholderTextColor="#8D8886"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      {loading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator color="#FFD34D" />
          <Text style={styles.stateText}>Đang tải cuộc trò chuyện...</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <View style={styles.stateWrap}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.conversationId}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Không tìm thấy đoạn chat phù hợp.</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.itemRow}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ChatConversation', {
              userId: item.partnerId,
              name: item.partnerName,
              avatar: item.partnerAvatar,
              conversationId: item.conversationId,
            })}
          >
            <Image source={{ uri: safeImageUri(item.partnerAvatar, DEFAULT_AVATAR_URL) }} style={styles.avatar} />

            <View style={styles.itemBody}>
              <View style={styles.itemTopRow}>
                <Text numberOfLines={1} style={styles.nameText}>{item.partnerName}</Text>
                <Text style={styles.timeText}>{formatConversationTime(item.lastMessageAt)}</Text>
              </View>
              <Text numberOfLines={1} style={styles.messageText}>{item.lastMessage}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0908',
  },
  searchWrap: {
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D2725',
    backgroundColor: '#191514',
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 15,
    paddingVertical: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  stateWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  stateText: {
    color: '#A39C99',
    marginTop: 8,
  },
  errorText: {
    color: '#ff7b7b',
    textAlign: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: '#231E1C',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
    backgroundColor: '#3A3330',
  },
  itemBody: {
    flex: 1,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
    flex: 1,
  },
  timeText: {
    color: '#A39C99',
    fontSize: 12,
  },
  messageText: {
    color: '#C4BCB8',
    fontSize: 14,
  },
  emptyText: {
    color: '#9D9692',
    textAlign: 'center',
    marginTop: 28,
  },
});

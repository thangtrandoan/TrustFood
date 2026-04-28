import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BottomBar from '../../components/BottomBar';
import TopBar from '../../components/TopBar';
import { RootStackParamList } from '../../navigation/RootNavigator';
import {
  getMyNotifications,
  markAllMyNotificationsRead,
  markNotificationRead,
  NotificationCursor,
  NotificationDocument,
} from '../../services/firebase';

type UiNotification = NotificationDocument & {
  createdAtLabel: string;
};

function formatTime(value: NotificationDocument['created_at']): string {
  const ms = (value as any)?.toMillis?.();
  if (!ms) {
    return 'Vừa xong';
  }

  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) {
    return `${diffSec}s`;
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}p`;
  }

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return `${diffHour}h`;
  }

  return `${Math.floor(diffHour / 24)}d`;
}

function toUi(item: NotificationDocument): UiNotification {
  return {
    ...item,
    createdAtLabel: formatTime(item.created_at),
  };
}

export default function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<UiNotification[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState('');

  const cursorRef = useRef<NotificationCursor>(null);
  const hasMoreRef = useRef(true);

  const loadFirstPage = useCallback(async () => {
    const result = await getMyNotifications({ pageSize: 20 });
    setItems(result.items.map(toUi));
    cursorRef.current = result.nextCursor;
    hasMoreRef.current = Boolean(result.nextCursor);
  }, []);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await loadFirstPage();
        if (!mounted) {
          return;
        }
        setError('');
      } catch (e) {
        if (!mounted) {
          return;
        }
        setError(e instanceof Error ? e.message : 'Không thể tải thông báo');
      } finally {
        if (mounted) {
          setInitialLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loadFirstPage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadFirstPage();
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể làm mới thông báo');
    } finally {
      setRefreshing(false);
    }
  }, [loadFirstPage]);

  const onEndReached = useCallback(async () => {
    if (loadingMore || !hasMoreRef.current || !cursorRef.current) {
      return;
    }

    setLoadingMore(true);
    try {
      const result = await getMyNotifications({ pageSize: 20, cursor: cursorRef.current });
      setItems((prev) => [...prev, ...result.items.map(toUi)]);
      cursorRef.current = result.nextCursor;
      hasMoreRef.current = Boolean(result.nextCursor);
    } catch {
      // no-op for infinite scroll fail
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore]);

  const onPressNotification = useCallback(async (item: UiNotification) => {
    if (item.is_read) {
      return;
    }

    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, is_read: true } : it)));

    try {
      await markNotificationRead(item.id);
    } catch {
      setItems((prev) => prev.map((it) => (it.id === item.id ? item : it)));
    }
  }, []);

  const onMarkAllRead = useCallback(async () => {
    if (markingAll) {
      return;
    }

    setMarkingAll(true);
    const oldItems = items;
    setItems((prev) => prev.map((it) => ({ ...it, is_read: true })));

    try {
      await markAllMyNotificationsRead();
    } catch {
      setItems(oldItems);
    } finally {
      setMarkingAll(false);
    }
  }, [items, markingAll]);

  return (
    <SafeAreaView style={styles.container}>
      <TopBar
        title="Thông báo"
        leftIcon="arrow-back"
        onPressLeft={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
            return;
          }
          navigation.navigate('Discover');
        }}
        rightIcon={markingAll ? 'sync-outline' : 'checkmark-done-outline'}
        onPressRight={() => {
          void onMarkAllRead();
        }}
      />

      {initialLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color="#F8C819" />
          <Text style={styles.stateText}>Đang tải thông báo...</Text>
        </View>
      ) : null}

      {!initialLoading && error ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!initialLoading && !error ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          onEndReachedThreshold={0.5}
          onEndReached={onEndReached}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>Bạn chưa có thông báo nào.</Text>}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#aaa" /> : null}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => onPressNotification(item)}
              style={[styles.itemCard, item.is_read ? styles.itemRead : styles.itemUnread]}
            >
              <View style={styles.itemHeader}>
                <Text style={styles.itemType}>{item.type.split('_').join(' ')}</Text>
                <Text style={styles.itemTime}>{item.createdAtLabel}</Text>
              </View>
              <Text style={styles.itemContent}>{item.content}</Text>
            </TouchableOpacity>
          )}
        />
      ) : null}

      <BottomBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0b' },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  stateText: { color: '#aaa', marginTop: 8 },
  errorText: { color: '#ff7b7b' },
  listContent: { padding: 16, paddingBottom: 90, gap: 10 },
  emptyText: { color: '#777', textAlign: 'center', marginTop: 20 },
  itemCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  itemUnread: {
    borderColor: '#F8C819',
    backgroundColor: '#1e1710',
  },
  itemRead: {
    borderColor: '#2a2421',
    backgroundColor: '#171311',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemType: { color: '#F8C819', fontWeight: '700', textTransform: 'capitalize' },
  itemTime: { color: '#999', fontSize: 12 },
  itemContent: { color: '#f2f2f2', lineHeight: 20 },
});

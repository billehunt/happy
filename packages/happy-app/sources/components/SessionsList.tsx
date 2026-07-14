import React from 'react';
import { View, Pressable, FlatList, Platform, TextInput, Modal as RNModal, useWindowDimensions } from 'react-native';
import { Text } from '@/components/StyledText';
import { usePathname, useRouter } from 'expo-router';
import { SessionListViewItem, SessionRowData, useSessionListViewData, useAllSessions, useLocalSettingMutable } from '@/sync/storage';
import { Ionicons } from '@expo/vector-icons';
import { formatCompactTime, formatPathRelativeToHome } from '@/utils/sessionUtils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from '@/constants/Typography';
import { StatusDot } from './StatusDot';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useIsTablet } from '@/utils/responsive';
import { requestReview } from '@/utils/requestReview';
import { UpdateBanner } from './UpdateBanner';
import { layout } from './layout';
import { useNavigateToSession } from '@/hooks/useNavigateToSession';
import { SessionActionsAnchor, SessionActionsPopover } from './SessionActionsPopover';
import { useSessionActionAlert } from '@/hooks/useSessionQuickActions';
import { useNewSessionDraft } from '@/hooks/useNewSessionDraft';
import { SessionListControls, ScopeProjectOption } from './SessionListControls';
import { sessionSetUserMeta } from '@/sync/ops';
import { Modal } from '@/modal';
import { t } from '@/text';

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'stretch',
        backgroundColor: theme.colors.groupped.background,
    },
    contentContainer: {
        flex: 1,
        maxWidth: layout.maxWidth,
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingLeft: 20,
        paddingRight: 16,
        paddingTop: 14,
        paddingBottom: 4,
    },
    groupChevron: {
        color: theme.colors.groupped.sectionTitle,
        width: 12,
    },
    groupHeaderText: {
        fontSize: 12.5,
        fontWeight: '600',
        color: theme.colors.groupped.sectionTitle,
        letterSpacing: 0.2,
        ...Typography.default('semiBold'),
    },
    groupHeaderSubtitle: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        flexShrink: 1,
        ...Typography.default(),
    },
    groupSpacer: {
        flex: 1,
    },
    groupPlus: {
        width: 24,
        height: 24,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sessionItem: {
        minHeight: 58,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: theme.colors.surface,
    },
    sessionItemContainer: {
        marginHorizontal: 12,
        marginBottom: 1,
        overflow: 'hidden',
    },
    sessionItemFirst: {
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    sessionItemLast: {
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    sessionItemSingle: {
        borderRadius: 12,
    },
    sessionItemContainerFirst: {
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    sessionItemContainerLast: {
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        marginBottom: 10,
    },
    sessionItemContainerSingle: {
        borderRadius: 12,
        marginBottom: 10,
    },
    sessionItemSelected: {
        backgroundColor: theme.dark ? 'rgba(10, 132, 255, 0.16)' : 'rgba(0, 122, 255, 0.08)',
    },
    sessionCurrentAccent: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        backgroundColor: theme.colors.radio.active,
    },
    sessionItemKeyboard: {
        borderWidth: 2,
        borderColor: theme.colors.button.primary.background,
    },
    statusDotContainer: {
        width: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sessionContent: {
        flex: 1,
        justifyContent: 'center',
        minWidth: 0,
    },
    sessionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    sessionTitle: {
        fontSize: 14,
        fontWeight: '400',
        flexShrink: 1,
        ...Typography.default(),
    },
    sessionTitleUnread: {
        fontWeight: '500',
        ...Typography.default('semiBold'),
    },
    sessionTitleConnected: {
        color: theme.colors.text,
    },
    sessionTitleDisconnected: {
        color: theme.colors.textSecondary,
    },
    pinIcon: {
        color: theme.colors.textSecondary,
    },
    archivedBadge: {
        fontSize: 9.5,
        fontWeight: '600',
        letterSpacing: 0.4,
        color: theme.colors.textSecondary,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.divider,
        borderRadius: 5,
        paddingHorizontal: 5,
        paddingVertical: 1,
        overflow: 'hidden',
    },
    sessionSubtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 1,
        ...Typography.default(),
    },
    sessionSide: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 3,
        minWidth: 26,
    },
    sessionTime: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        ...Typography.default(),
    },
    unreadDot: {
        width: 9,
        height: 9,
        borderRadius: 5,
        backgroundColor: theme.colors.radio.dot,
    },
    draftIcon: {
        color: theme.colors.textSecondary,
    },
    renameInput: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
        paddingVertical: 0,
        paddingHorizontal: 4,
        borderWidth: 1,
        borderColor: theme.colors.button.primary.background,
        borderRadius: 5,
        ...Typography.default('semiBold'),
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
    },
    emptySearch: {
        paddingHorizontal: 24,
        paddingVertical: 32,
        alignItems: 'center',
    },
    emptySearchText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        ...Typography.default(),
    },
    groupMenu: {
        position: 'absolute',
        width: 224,
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        overflow: 'hidden',
        paddingVertical: 5,
        shadowColor: theme.colors.shadow.color,
        shadowOpacity: theme.colors.shadow.opacity,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
    },
    groupMenuItem: {
        minHeight: 42,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        gap: 10,
    },
    groupMenuItemPressed: {
        backgroundColor: theme.colors.surfaceSelected,
    },
    groupMenuLabel: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
        ...Typography.default(),
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
}));

function sessionMatchesQuery(session: SessionRowData, query: string): boolean {
    const haystack = `${session.name} ${session.path ?? ''} ${session.host ?? ''}`.toLowerCase();
    return haystack.includes(query);
}

type ProjectGroupItem = Extract<SessionListViewItem, { type: 'group' }>;

export function SessionsList() {
    const styles = stylesheet;
    const { theme } = useUnistyles();
    const safeArea = useSafeAreaInsets();
    const { height: windowHeight, width: windowWidth } = useWindowDimensions();
    const data = useSessionListViewData();
    const allSessions = useAllSessions();
    const pathname = usePathname();
    const isTablet = useIsTablet();
    const router = useRouter();
    const draft = useNewSessionDraft();
    const navigateToSession = useNavigateToSession();
    const [query, setQuery] = React.useState('');
    const [keyboardIndex, setKeyboardIndex] = React.useState(-1);
    const searchInputRef = React.useRef<TextInput>(null);
    const listRef = React.useRef<FlatList<SessionListViewItem>>(null);
    const [collapsedGroups, setCollapsedGroups] = useLocalSettingMutable('collapsedSessionGroups');
    const [scopedProjects, setScopedProjects] = useLocalSettingMutable('sessionScopedProjects');
    const [groupMenu, setGroupMenu] = React.useState<{ group: ProjectGroupItem; x: number; y: number } | null>(null);

    // The archived group defaults to collapsed; everything else to expanded
    const isGroupCollapsed = React.useCallback((key: string) => {
        return collapsedGroups[key] ?? (key === 'archived');
    }, [collapsedGroups]);

    const toggleGroup = React.useCallback((key: string) => {
        setCollapsedGroups({ ...collapsedGroups, [key]: !isGroupCollapsed(key) });
    }, [collapsedGroups, isGroupCollapsed, setCollapsedGroups]);

    // Scope menu lists every project (not just currently-visible ones)
    const projects = React.useMemo<ScopeProjectOption[]>(() => {
        const byPath = new Map<string, Set<string>>();
        allSessions.forEach(session => {
            const path = session.metadata?.path;
            if (!path) return;
            const hosts = byPath.get(path) ?? byPath.set(path, new Set()).get(path)!;
            if (session.metadata?.host) hosts.add(session.metadata.host);
        });
        return [...byPath.entries()]
            .map(([path, hosts]) => ({
                path,
                title: path.split(/[/\\]/).filter(Boolean).pop() ?? path,
                hosts: [...hosts].join(', '),
            }))
            .sort((a, b) => a.title.localeCompare(b.title));
    }, [allSessions]);

    // Search flattens the list (archived included — rows carry a badge);
    // otherwise drop rows of collapsed groups.
    const isSearching = query.trim().length > 0;
    const visibleData = React.useMemo<SessionListViewItem[] | null>(() => {
        if (!data) return data;
        const normalizedQuery = query.trim().toLowerCase();
        if (normalizedQuery) {
            return data.filter(item =>
                item.type === 'session' && sessionMatchesQuery(item.session, normalizedQuery));
        }
        const result: SessionListViewItem[] = [];
        for (const item of data) {
            if (item.type === 'group') {
                result.push(item);
            } else if (item.groupKey === 'all' || !isGroupCollapsed(item.groupKey)) {
                result.push(item);
            }
        }
        return result;
    }, [data, query, isGroupCollapsed]);

    // Machine name is stated once up top when every live session shares it —
    // and nowhere else
    const singleHost = React.useMemo(() => {
        if (!data) return null;
        const hosts = new Set<string>();
        for (const item of data) {
            if (item.type === 'session' && !item.session.archived && item.session.host) {
                hosts.add(item.session.host);
            }
        }
        return hosts.size === 1 ? [...hosts][0] : null;
    }, [data]);

    const startSessionInProject = React.useCallback((group: ProjectGroupItem) => {
        if (group.machineId) {
            draft.setMachineId(group.machineId);
        }
        if (group.path) {
            draft.setPath(formatPathRelativeToHome(group.path, group.homeDir ?? undefined));
        }
        draft.setSessionType('simple');
        router.navigate('/new');
    }, [draft, router]);

    const openGroupMenu = React.useCallback((group: ProjectGroupItem, x: number, y: number) => {
        setGroupMenu({ group, x, y });
    }, []);

    const showGroupActionsAlert = React.useCallback((group: ProjectGroupItem) => {
        Modal.alert(group.title, undefined, [
            { text: t('sidebar.showOnlyProject'), onPress: () => setScopedProjects([group.path!]) },
            { text: t('sidebar.newSessionHere'), onPress: () => startSessionInProject(group) },
            { text: t('common.cancel'), style: 'cancel' },
        ]);
    }, [setScopedProjects, startSessionInProject]);

    // "/" focuses search; ↓/↑/Enter walk and open results (web only).
    // Refs mirror state so the single window listener never goes stale.
    const visibleDataRef = React.useRef(visibleData);
    visibleDataRef.current = visibleData;
    const keyboardIndexRef = React.useRef(keyboardIndex);
    keyboardIndexRef.current = keyboardIndex;
    const searchFocusedRef = React.useRef(false);
    const handleSearchFocusChange = React.useCallback((focused: boolean) => {
        searchFocusedRef.current = focused;
    }, []);
    React.useEffect(() => {
        if (Platform.OS !== 'web') return;
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName;
            // Arrow/Enter stay live while the sidebar search field has focus;
            // any other field owns its own keys
            const inOtherField = !searchFocusedRef.current
                && (tag === 'INPUT' || tag === 'TEXTAREA' || !!target?.isContentEditable);
            if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
                if (searchFocusedRef.current || inOtherField) return;
                e.preventDefault();
                searchInputRef.current?.focus();
                return;
            }
            if (inOtherField) return;
            const items = visibleDataRef.current ?? [];
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                const rowIndexes: number[] = [];
                items.forEach((item, i) => { if (item.type === 'session') rowIndexes.push(i); });
                if (rowIndexes.length === 0) return;
                e.preventDefault();
                const pos = rowIndexes.indexOf(keyboardIndexRef.current);
                const nextPos = e.key === 'ArrowDown'
                    ? Math.min(pos + 1, rowIndexes.length - 1)
                    : Math.max(pos - 1, 0);
                const next = rowIndexes[nextPos];
                setKeyboardIndex(next);
                listRef.current?.scrollToIndex({ index: next, viewPosition: 0.5 });
                return;
            }
            if (e.key === 'Enter') {
                const item = keyboardIndexRef.current >= 0 ? items[keyboardIndexRef.current] : undefined;
                if (item?.type === 'session') {
                    navigateToSession(item.session.id);
                    setQuery('');
                    setKeyboardIndex(-1);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigateToSession]);

    // Reset keyboard cursor whenever the visible set changes shape
    React.useEffect(() => {
        setKeyboardIndex(-1);
    }, [query]);

    // Selection is derived once from pathname so the data array stays stable
    // across navigations — only the previously- and newly-selected rows
    // re-render instead of the whole visible window.
    const selectedSessionId = React.useMemo<string | undefined>(() => {
        if (!isTablet) return undefined;
        if (!pathname.startsWith('/session/')) return undefined;
        return pathname.split('/')[2];
    }, [isTablet, pathname]);

    // Request review
    React.useEffect(() => {
        if (data && data.length > 0) {
            requestReview();
        }
    }, [data && data.length > 0]);

    const keyExtractor = React.useCallback((item: SessionListViewItem) => {
        switch (item.type) {
            case 'group': return `group-${item.key}`;
            case 'session': return `session-${item.session.id}`;
        }
    }, []);

    const renderItem = React.useCallback(({ item, index }: { item: SessionListViewItem, index: number }) => {
        switch (item.type) {
            case 'group': {
                const collapsed = isGroupCollapsed(item.key);
                const isProject = item.kind === 'project';
                const menuProps = isProject ? (Platform.OS === 'web' ? {
                    onContextMenu: (event: any) => {
                        event.preventDefault?.();
                        openGroupMenu(item, event.nativeEvent.clientX ?? 0, event.nativeEvent.clientY ?? 0);
                    },
                } as any : {
                    onLongPress: () => showGroupActionsAlert(item),
                }) : {};
                return (
                    <Pressable style={styles.groupHeader} onPress={() => toggleGroup(item.key)} {...menuProps}>
                        <Ionicons
                            name={collapsed ? 'chevron-forward' : 'chevron-down'}
                            size={11}
                            style={styles.groupChevron}
                        />
                        <Text style={styles.groupHeaderText} numberOfLines={1}>
                            {item.title}
                        </Text>
                        {item.subtitle ? (
                            <Text style={styles.groupHeaderSubtitle} numberOfLines={1}>
                                {item.subtitle}
                            </Text>
                        ) : null}
                        <View style={styles.groupSpacer} />
                        {isProject && (
                            <Pressable
                                style={styles.groupPlus}
                                onPress={() => startSessionInProject(item)}
                                hitSlop={6}
                                accessibilityLabel={t('sidebar.newSessionHere')}
                            >
                                <Ionicons name="add" size={17} color={theme.colors.textSecondary} />
                            </Pressable>
                        )}
                    </Pressable>
                );
            }

            case 'session': {
                const listData = visibleData!;
                const prevItem = index > 0 ? listData[index - 1] : null;
                const nextItem = index < listData.length - 1 ? listData[index + 1] : null;

                const isFirst = prevItem == null || prevItem.type === 'group';
                const isLast = nextItem == null || nextItem.type === 'group';

                return (
                    <SessionItem
                        session={item.session}
                        selected={item.session.id === selectedSessionId}
                        isFirst={isFirst}
                        isLast={isLast}
                        isSingle={isFirst && isLast}
                        keyboardSelected={index === keyboardIndex}
                        showArchivedBadge={isSearching && item.session.archived}
                        showHost={isSearching && !singleHost}
                    />
                );
            }
        }
    }, [selectedSessionId, visibleData, isGroupCollapsed, toggleGroup, isSearching, singleHost, keyboardIndex, startSessionInProject, openGroupMenu, showGroupActionsAlert, theme.colors.textSecondary]);

    const HeaderComponent = React.useCallback(() => {
        return (
            <UpdateBanner />
        );
    }, []);

    const EmptyComponent = React.useCallback(() => {
        if (!isSearching) return null;
        return (
            <View style={styles.emptySearch}>
                <Text style={styles.emptySearchText}>
                    {t('sidebar.searchNoResults', { query: query.trim() })}
                </Text>
            </View>
        );
    }, [isSearching, query]);

    // Early return if no data yet
    if (!visibleData) {
        return (
            <View style={styles.container} />
        );
    }

    const groupMenuPosition = groupMenu ? {
        left: Math.max(12, Math.min(windowWidth - 224 - 12, groupMenu.x)),
        top: Math.max(12, Math.min(windowHeight - 120, groupMenu.y)),
    } : null;

    return (
        <View style={styles.container}>
            <View style={styles.contentContainer}>
                <SessionListControls
                    query={query}
                    onQueryChange={setQuery}
                    inputRef={searchInputRef}
                    projects={projects}
                    singleHost={singleHost}
                    onSearchFocusChange={handleSearchFocusChange}
                />
                <FlatList
                    ref={listRef}
                    data={visibleData}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    extraData={`${selectedSessionId}:${keyboardIndex}`}
                    contentContainerStyle={{ paddingBottom: safeArea.bottom + 128, maxWidth: layout.maxWidth }}
                    ListHeaderComponent={HeaderComponent}
                    ListEmptyComponent={EmptyComponent}
                    onScrollToIndexFailed={() => { /* variable row heights; best-effort */ }}
                    windowSize={5}
                    maxToRenderPerBatch={8}
                    initialNumToRender={16}
                />
            </View>
            {Platform.OS === 'web' && groupMenuPosition && groupMenu && (
                <RNModal animationType="none" transparent visible onRequestClose={() => setGroupMenu(null)}>
                    <Pressable onPress={() => setGroupMenu(null)} style={styles.backdrop} />
                    <View style={[styles.groupMenu, groupMenuPosition]}>
                        <Pressable
                            style={({ pressed }) => [styles.groupMenuItem, pressed && styles.groupMenuItemPressed]}
                            onPress={() => {
                                setScopedProjects([groupMenu.group.path!]);
                                setGroupMenu(null);
                            }}
                        >
                            <Ionicons name="funnel-outline" size={16} color={theme.colors.text} />
                            <Text style={styles.groupMenuLabel}>{t('sidebar.showOnlyProject')}</Text>
                        </Pressable>
                        <Pressable
                            style={({ pressed }) => [styles.groupMenuItem, pressed && styles.groupMenuItemPressed]}
                            onPress={() => {
                                setGroupMenu(null);
                                startSessionInProject(groupMenu.group);
                            }}
                        >
                            <Ionicons name="add" size={16} color={theme.colors.text} />
                            <Text style={styles.groupMenuLabel}>{t('sidebar.newSessionHere')}</Text>
                        </Pressable>
                    </View>
                </RNModal>
            )}
        </View>
    );
}

const STATUS_CONFIG = {
    disconnected: { dotColor: '#999', isPulsing: false, isConnected: false },
    thinking: { dotColor: '#34C759', isPulsing: true, isConnected: true },
    waiting: { dotColor: '#34C759', isPulsing: false, isConnected: true },
    permission_required: { dotColor: '#FF9500', isPulsing: true, isConnected: true },
} as const;

const SessionItem = React.memo(({ session, selected, isFirst, isLast, isSingle, keyboardSelected, showArchivedBadge, showHost }: {
    session: SessionRowData;
    selected?: boolean;
    isFirst?: boolean;
    isLast?: boolean;
    isSingle?: boolean;
    keyboardSelected?: boolean;
    showArchivedBadge?: boolean;
    showHost?: boolean;
}) => {
    const styles = stylesheet;
    const navigateToSession = useNavigateToSession();
    const [actionsAnchor, setActionsAnchor] = React.useState<SessionActionsAnchor | null>(null);
    const [renaming, setRenaming] = React.useState(false);
    const [renameValue, setRenameValue] = React.useState('');
    const status = STATUS_CONFIG[session.state];

    const handlePress = React.useCallback(() => {
        navigateToSession(session.id);
    }, [navigateToSession, session.id]);

    const handleContextMenu = React.useCallback((event: any) => {
        event.preventDefault?.();
        event.stopPropagation?.();
        setActionsAnchor({
            type: 'point',
            x: event.nativeEvent.clientX ?? event.nativeEvent.pageX ?? 0,
            y: event.nativeEvent.clientY ?? event.nativeEvent.pageY ?? 0,
        });
    }, []);

    // Double-click renames inline (web); native uses the context menu prompt
    const lastPress = React.useRef(0);
    const startInlineRename = React.useCallback(() => {
        setRenameValue(session.name);
        setRenaming(true);
    }, [session.name]);
    const handlePressWithDoubleClick = React.useCallback(() => {
        if (Platform.OS === 'web') {
            const nowTs = Date.now();
            if (nowTs - lastPress.current < 300) {
                lastPress.current = 0;
                startInlineRename();
                return;
            }
            lastPress.current = nowTs;
        }
        handlePress();
    }, [handlePress, startInlineRename]);

    const commitRename = React.useCallback((commit: boolean) => {
        setRenaming(false);
        if (commit) {
            const trimmed = renameValue.trim();
            if (trimmed !== session.name) {
                sessionSetUserMeta(session.id, { customName: trimmed || null });
            }
        }
    }, [renameValue, session.id, session.name]);

    const showActionAlert = useSessionActionAlert(session.id);
    const menuProps = Platform.OS === 'web' ? {
        onContextMenu: handleContextMenu,
    } as any : {
        onLongPress: showActionAlert,
    };

    const subtitleParts: string[] = [];
    const folder = session.path?.split(/[/\\]/).filter(Boolean).pop();
    if (folder) subtitleParts.push(folder);
    else if (session.subtitle) subtitleParts.push(session.subtitle);
    if (showHost && session.host) subtitleParts.push(session.host);

    return (
        <View style={[
            styles.sessionItemContainer,
            isSingle ? styles.sessionItemContainerSingle :
                isFirst ? styles.sessionItemContainerFirst :
                    isLast ? styles.sessionItemContainerLast : {}
        ]}>
        <Pressable
            style={[
                styles.sessionItem,
                selected && styles.sessionItemSelected,
                keyboardSelected && styles.sessionItemKeyboard,
                isSingle ? styles.sessionItemSingle :
                    isFirst ? styles.sessionItemFirst :
                        isLast ? styles.sessionItemLast : {}
            ]}
            onPress={handlePressWithDoubleClick}
            accessibilityState={{ selected: !!selected }}
            {...menuProps}
        >
            {selected && <View style={styles.sessionCurrentAccent} pointerEvents="none" />}
            <View style={styles.statusDotContainer}>
                <StatusDot color={status.dotColor} isPulsing={status.isPulsing} />
            </View>
            <View style={styles.sessionContent}>
                {renaming ? (
                    <TextInput
                        style={styles.renameInput}
                        value={renameValue}
                        onChangeText={setRenameValue}
                        onBlur={() => commitRename(true)}
                        onSubmitEditing={() => commitRename(true)}
                        onKeyPress={(e: any) => {
                            if (e.nativeEvent?.key === 'Escape') commitRename(false);
                        }}
                        autoFocus
                        selectTextOnFocus
                    />
                ) : (
                    <View style={styles.sessionTitleRow}>
                        {session.pinned && (
                            <Ionicons name="pin" size={11} style={styles.pinIcon} />
                        )}
                        <Text style={[
                            styles.sessionTitle,
                            session.hasUnread && styles.sessionTitleUnread,
                            status.isConnected ? styles.sessionTitleConnected : styles.sessionTitleDisconnected
                        ]} numberOfLines={1}>
                            {session.name}
                        </Text>
                        {showArchivedBadge && (
                            <Text style={styles.archivedBadge}>{t('sidebar.archived')}</Text>
                        )}
                    </View>
                )}
                {subtitleParts.length > 0 && (
                    <Text style={styles.sessionSubtitle} numberOfLines={1}>
                        {subtitleParts.join(' · ')}
                    </Text>
                )}
            </View>
            <View style={styles.sessionSide}>
                {!session.active && session.activeAt != null && (
                    <Text style={styles.sessionTime}>{formatCompactTime(session.activeAt)}</Text>
                )}
                {session.hasUnread && <View style={styles.unreadDot} />}
                {session.hasDraft && (
                    <Ionicons name="create-outline" size={12} style={styles.draftIcon} />
                )}
            </View>
        </Pressable>
        {Platform.OS === 'web' && (
            <SessionActionsPopover
                anchor={actionsAnchor}
                onClose={() => setActionsAnchor(null)}
                sessionId={session.id}
                visible={!!actionsAnchor}
            />
        )}
        </View>
    );
});

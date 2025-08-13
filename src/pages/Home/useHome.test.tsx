import { Mock } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNavigate } from 'react-router-dom'
import type { FC, ReactNode } from 'react'
import type { ShellContextProps } from 'contexts/ShellContext'
import { ShellContext } from 'contexts/ShellContext'

import { useHome } from './useHome'

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}))

vi.mock('config/router', () => ({
  routerType: 'browser',
}))

const mockSetTitle = vi.fn()

const MockShellContextProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  return (
    // NOTE: Only properties necessary for the tests are mocked
    <ShellContext.Provider
      value={{ setTitle: mockSetTitle } as unknown as ShellContextProps}
    >
      {children}
    </ShellContext.Provider>
  )
}

describe('useHome Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        origin: 'http://localhost:3000',
      },
    })
  })

  it('should initialize with a UUID roomName and correct initial state', () => {
    const { result } = renderHook(() => useHome(), {
      wrapper: MockShellContextProvider,
    })

    expect(result.current.roomName).toBeDefined()
    expect(result.current.showEmbedCode).toBe(false)
    expect(result.current.isRoomNameValid).toBe(true) // UUID is not empty
  })

  it('should call setTitle on mount', () => {
    renderHook(() => useHome(), { wrapper: MockShellContextProvider })
    expect(mockSetTitle).toHaveBeenCalledWith('Chitchatter')
  })

  it('should update roomName state when handleRoomNameChange is called', () => {
    const { result } = renderHook(() => useHome(), {
      wrapper: MockShellContextProvider,
    })
    const event = {
      target: { value: 'newRoomName' },
    } as React.ChangeEvent<HTMLInputElement>

    act(() => {
      result.current.handleRoomNameChange(event)
    })

    expect(result.current.roomName).toBe('newRoomName')
  })

  it('should strip the room name prefix when handleRoomNameChange is called', () => {
    const { result } = renderHook(() => useHome(), {
      wrapper: MockShellContextProvider,
    })

    const event = {
      target: { value: 'http://localhost:3000/public/prefixedRoomName' },
    } as React.ChangeEvent<HTMLInputElement>

    act(() => {
      result.current.handleRoomNameChange(event)
    })

    expect(result.current.roomName).toBe('prefixedRoomName')
  })

  it('should handle form submit', () => {
    const { result } = renderHook(() => useHome(), {
      wrapper: MockShellContextProvider,
    })
    const event = {
      preventDefault: vi.fn(),
    } as unknown as React.SyntheticEvent<HTMLFormElement>

    act(() => {
      result.current.handleFormSubmit(event)
    })

    expect(event.preventDefault).toHaveBeenCalled()
  })

  it('should navigate to the public room when handleJoinPublicRoomClick is called', () => {
    const navigate = vi.fn()

    ;(useNavigate as Mock).mockReturnValue(navigate)

    const { result } = renderHook(() => useHome(), {
      wrapper: MockShellContextProvider,
    })

    act(() => {
      result.current.handleJoinPublicRoomClick()
    })

    expect(navigate).toHaveBeenCalledWith(`/public/${result.current.roomName}`)
  })

  it('should navigate to the private room when handleJoinPrivateRoomClick is called', () => {
    const navigate = vi.fn()
    ;(useNavigate as Mock).mockReturnValue(navigate)
    const { result } = renderHook(() => useHome(), {
      wrapper: MockShellContextProvider,
    })

    act(() => {
      result.current.handleJoinPrivateRoomClick()
    })

    expect(navigate).toHaveBeenCalledWith(`/private/${result.current.roomName}`)
  })

  it('should set showEmbedCode to true when handleGetEmbedCodeClick is called', () => {
    const { result } = renderHook(() => useHome(), {
      wrapper: MockShellContextProvider,
    })

    act(() => {
      result.current.handleGetEmbedCodeClick()
    })

    expect(result.current.showEmbedCode).toBe(true)
  })

  it('should set showEmbedCode to false when handleEmbedCodeWindowClose is called', () => {
    const { result } = renderHook(() => useHome(), {
      wrapper: MockShellContextProvider,
    })

    act(() => {
      result.current.handleGetEmbedCodeClick() // First, open it
      result.current.handleEmbedCodeWindowClose()
    })

    expect(result.current.showEmbedCode).toBe(false)
  })

  it('should validate room name correctly', () => {
    const { result } = renderHook(() => useHome(), {
      wrapper: MockShellContextProvider,
    })

    act(() => {
      result.current.setRoomName('')
    })
    expect(result.current.isRoomNameValid).toBe(false)

    act(() => {
      result.current.setRoomName('validRoomName')
    })
    expect(result.current.isRoomNameValid).toBe(true)
  })

  it('should handle room names without any prefix', () => {
    const { result } = renderHook(() => useHome(), {
      wrapper: MockShellContextProvider,
    })

    const event = {
      target: { value: 'plainRoomName' },
    } as React.ChangeEvent<HTMLInputElement>

    act(() => {
      result.current.handleRoomNameChange(event)
    })

    expect(result.current.roomName).toBe('plainRoomName')
  })
})
